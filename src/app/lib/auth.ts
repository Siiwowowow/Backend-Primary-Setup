import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";
import { Role, userStatus } from "../../generated/prisma/enums";
// If your Prisma file is located elsewhere, you can change the path


export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  emailAndPassword: {
    enabled: true,
  },

  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: Role.USER,
      },
      status: {
        type: "string",
        defaultValue: userStatus.ACTIVE,
      },
      needPasswordChange: {
        type: "boolean",
        defaultValue: false,
      },
      isDeleted: {
        type: "boolean",
        defaultValue: false,
      },
      deletedAt: {
        type: "date",
        required: false,
      },
    },
  },

  session: {
    expiresIn: 60 * 60 * 24, // ✅ 1 day (FIXED)
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 60 * 60 * 24,
    },
  },
});