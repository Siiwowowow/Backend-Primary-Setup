/* eslint-disable no-constant-condition */
/* eslint-disable @typescript-eslint/no-explicit-any */
import status from "http-status";
import AppError from "../../errorHelpers/AppError";
import { auth } from "../../lib/auth";
import { IChangePasswordPayload, ILoginUserPayload, IRegisterUserPayload } from "./auth.interface";
import { tokenUtils } from "../../utils/token";
import { prisma } from "../../lib/prisma";
import { jwtUtils } from "../../utils/jwt";
import { JwtPayload } from "jsonwebtoken";
import { envVars } from "../../config/env";
import { hashPassword, verifyPassword } from "better-auth/crypto";
import { randomBytes } from "node:crypto";

/** Must match `session.expiresIn` in lib/auth.ts (seconds) → ms for Date */
const SESSION_DURATION_MS = 60 * 60 * 24 * 1000;

const registerUSer = async (payload: IRegisterUserPayload) => {
  const { name, email, password } = payload;

  const data = await auth.api.signUpEmail({
    body: { name, email, password },
  });

  if (!data.user) {
    throw new AppError(status.BAD_REQUEST, "Registration failed");
  }

  const token = data.token;

  const accessToken = tokenUtils.getAccessToken({
    userId: data.user.id,
    role: data.user.role,
    name: data.user.name,
    email: data.user.email,
    status: data.user.status,
    isDeleted: data.user.isDeleted,
    emailVerified: data.user.emailVerified,
  });

  const refreshToken = tokenUtils.getRefreshToken({
    userId: data.user.id,
    role: data.user.role,
    name: data.user.name,
    email: data.user.email,
    status: data.user.status,
    isDeleted: data.user.isDeleted,
    emailVerified: data.user.emailVerified,
  });

  return {
    user: data.user,
    token,
    accessToken,
    refreshToken,
  };
};

const loginUser = async (payload: ILoginUserPayload) => {
  const { email, password } = payload;

  const data = await auth.api.signInEmail({
    body: { email, password },
  });

  if (!data.user) {
    throw new AppError(status.UNAUTHORIZED, "Invalid email or password");
  }

  const token = data.token;

  const accessToken = tokenUtils.getAccessToken({
    userId: data.user.id,
    role: data.user.role,
    name: data.user.name,
    email: data.user.email,
    status: data.user.status,
    isDeleted: data.user.isDeleted,
    emailVerified: data.user.emailVerified,
  });

  const refreshToken = tokenUtils.getRefreshToken({
    userId: data.user.id,
    role: data.user.role,
    name: data.user.name,
    email: data.user.email,
    status: data.user.status,
    isDeleted: data.user.isDeleted,
    emailVerified: data.user.emailVerified,
  });

  return {
    user: data.user,
    token,
    accessToken,
    refreshToken,
  };
};

// =====================
// 🔥 FIXED GET ME SERVICE
// =====================
const getMe = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    include: {
      admin: true,
    },
  });

  if (!user) {
    throw new AppError(status.NOT_FOUND, "User not found");
  }

  return user;
};
const getNewToken = async (refreshToken : string, sessionToken : string) => {

    const isSessionTokenExists = await prisma.session.findUnique({
        where : {
            token : sessionToken,
        },
        include : {
            user : true,
        }
    })

    if(!isSessionTokenExists){
        throw new AppError(status.UNAUTHORIZED, "Invalid session token");
    }

    const verifiedRefreshToken = jwtUtils.verifyToken(refreshToken, envVars.REFRESH_TOKEN_SECRET)


    if(!verifiedRefreshToken.success){
        throw new AppError(status.UNAUTHORIZED, "Invalid refresh token");
    }

    const data = verifiedRefreshToken.data as JwtPayload;

    const newAccessToken = tokenUtils.getAccessToken({
        userId: data.userId,
        role: data.role,
        name: data.name,
        email: data.email,
        status: data.status,
        isDeleted: data.isDeleted,
        emailVerified: data.emailVerified,
    });

    const newRefreshToken = tokenUtils.getRefreshToken({
        userId: data.userId,
        role: data.role,
        name: data.name,
        email: data.email,
        status: data.status,
        isDeleted: data.isDeleted,
        emailVerified: data.emailVerified,
    });

    const { token } = await prisma.session.update({
        where: {
            token: sessionToken,
        },
        data: {
            token: sessionToken,
            expiresAt: new Date(Date.now() + SESSION_DURATION_MS),
            updatedAt: new Date(),
        },
    });

    return {
        accessToken : newAccessToken,
        refreshToken : newRefreshToken,
        sessionToken : token,
    }

}
const changePassword = async (
    payload: IChangePasswordPayload,
    sessionToken: string | undefined,
    authenticatedUserId: string
) => {
    const { currentPassword, newPassword } = payload;

    let user: NonNullable<Awaited<ReturnType<typeof prisma.user.findUnique>>>;
    let sessionId: string | null = null;

    if (sessionToken) {
        const sessionData = await prisma.session.findUnique({
            where: { token: sessionToken },
            include: { user: true },
        });

        if (!sessionData?.user) {
            throw new AppError(status.UNAUTHORIZED, "Invalid session token");
        }
        if (sessionData.user.id !== authenticatedUserId) {
            throw new AppError(status.UNAUTHORIZED, "Session does not match user");
        }
        if (sessionData.expiresAt < new Date()) {
            throw new AppError(status.UNAUTHORIZED, "Session token has expired");
        }

        user = sessionData.user;
        sessionId = sessionData.id;
    } else {
        const u = await prisma.user.findUnique({ where: { id: authenticatedUserId } });
        if (!u) {
            throw new AppError(status.NOT_FOUND, "User not found");
        }
        user = u;
    }

    const account = await prisma.account.findFirst({
        where: {
            userId: user.id,
            providerId: "credential",
        },
    });

    if (!account?.password) {
        throw new AppError(status.BAD_REQUEST, "Account not found");
    }

    const passwordOk = await verifyPassword({
        hash: account.password,
        password: currentPassword,
    });
    if (!passwordOk) {
        throw new AppError(status.UNAUTHORIZED, "Current password is incorrect");
    }

    try {
        const hashedPassword = await hashPassword(newPassword);

        await prisma.account.update({
            where: { id: account.id },
            data: { password: hashedPassword },
        });

        let newSessionToken: string | null = null;

        if (sessionId) {
            newSessionToken = randomBytes(32).toString("hex");
            await prisma.session.update({
                where: { id: sessionId },
                data: {
                    token: newSessionToken,
                    expiresAt: new Date(Date.now() + SESSION_DURATION_MS),
                    updatedAt: new Date(),
                },
            });
            await prisma.session.deleteMany({
                where: {
                    userId: user.id,
                    token: { not: newSessionToken },
                },
            });
        } else {
            await prisma.session.deleteMany({
                where: { userId: user.id },
            });
        }

        if (user.needPasswordChange) {
            await prisma.user.update({
                where: { id: user.id },
                data: { needPasswordChange: false },
            });
        }

        const accessToken = tokenUtils.getAccessToken({
            userId: user.id,
            role: user.role,
            name: user.name,
            email: user.email,
            status: user.status,
            isDeleted: user.isDeleted,
            emailVerified: user.emailVerified,
        });

        const refreshToken = tokenUtils.getRefreshToken({
            userId: user.id,
            role: user.role,
            name: user.name,
            email: user.email,
            status: user.status,
            isDeleted: user.isDeleted,
            emailVerified: user.emailVerified,
        });

        return {
            accessToken,
            refreshToken,
            token: newSessionToken,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
            },
        };
    } catch (error: unknown) {
        console.error("Password update error:", error);
        throw new AppError(status.BAD_REQUEST, "Failed to change password");
    }
};
export const AuthService = {
  registerUSer,
  loginUser,
  getMe,
  getNewToken,
  changePassword,
};