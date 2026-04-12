import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { AuthService } from "./auth.service";
import { sendResponse } from "../../shared/sendResponse";
import { tokenUtils } from "../../utils/token";
import status from "http-status";
import AppError from "../../errorHelpers/AppError";

const registerUser = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.registerUSer(req.body);

  const { accessToken, refreshToken, token, ...rest } = result;

  tokenUtils.setAccessTokenCookie(res, accessToken);
  tokenUtils.setRefreshTokenCookie(res, refreshToken);
  tokenUtils.setBetterAuthSessionCookie(res, token as string);

  sendResponse(res, {
    httpCode: 201,
    success: true,
    message: "User created successfully",
    data: {
      ...rest,
      accessToken,
      refreshToken,
      token,
    },
  });
});

const loginUser = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.loginUser(req.body);

  const { accessToken, refreshToken, token, ...rest } = result;

  tokenUtils.setAccessTokenCookie(res, accessToken);
  tokenUtils.setRefreshTokenCookie(res, refreshToken);
  tokenUtils.setBetterAuthSessionCookie(res, token);

  sendResponse(res, {
    httpCode: 200,
    success: true,
    message: "Login successful",
    data: {
      ...rest,
      accessToken,
      refreshToken,
      token,
    },
  });
});

// =====================
// 🔥 FIXED GET ME
// =====================
const getMe = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.userId;

  const result = await AuthService.getMe(userId);

  sendResponse(res, {
    httpCode: status.OK,
    success: true,
    message: "User profile fetched successfully",
    data: result,
  });
});
const getNewToken = catchAsync(
    async (req: Request, res: Response) => {
        const refreshToken = req.cookies.refreshToken;
        const betterAuthSessionToken = req.cookies["better-auth.session_token"];
        if (!refreshToken) {
            throw new AppError(status.UNAUTHORIZED, "Refresh token is missing");
        }
        const result = await AuthService.getNewToken(refreshToken, betterAuthSessionToken);

        const { accessToken, refreshToken: newRefreshToken, sessionToken } = result;

        tokenUtils.setAccessTokenCookie(res, accessToken);
        tokenUtils.setRefreshTokenCookie(res, newRefreshToken);
        tokenUtils.setBetterAuthSessionCookie(res, sessionToken);

        sendResponse(res, {
            httpCode: status.OK,
            success: true,
            message: "New tokens generated successfully",
            data: {
                accessToken,
                refreshToken: newRefreshToken,
                sessionToken,
            },
        });
    }
)
const changePassword = catchAsync(async (req: Request, res: Response) => {
    const payload = req.body;
    const betterAuthSessionToken = req.cookies["better-auth.session_token"] as
        | string
        | undefined;

    const result = await AuthService.changePassword(
        payload,
        betterAuthSessionToken,
        req.user.userId
    );

    const { accessToken, refreshToken, token: newSessionToken, ...rest } = result;

    tokenUtils.setAccessTokenCookie(res, accessToken);
    tokenUtils.setRefreshTokenCookie(res, refreshToken);

    if (newSessionToken) {
        tokenUtils.setBetterAuthSessionCookie(res, newSessionToken);
    } else {
        tokenUtils.clearBetterAuthSessionCookie(res);
    }

    sendResponse(res, {
        httpCode: status.OK,
        success: true,
        message: "Password changed successfully",
        data: {
            ...rest,
            accessToken,
            refreshToken,
            token: newSessionToken,
        },
    });
});


export const AuthController = {
  registerUser,
  loginUser,
  getMe,
  getNewToken,
  changePassword,
};