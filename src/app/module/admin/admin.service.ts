import { prisma } from "../../lib/prisma";
import AppError from "../../errorHelpers/AppError";
import status from "http-status";
import { ICreateAdmin, IUpdateAdmin } from "./admin.interface";
import { IRequestUser } from "../../interfaces/requestUser.interface";
import { Role, userStatus } from "../../../generated/prisma/enums";

const createAdmin = async (payload: ICreateAdmin) => {
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
  });

  if (!user) {
    throw new AppError(status.NOT_FOUND, "User not found");
  }

  const admin = await prisma.admin.create({
    data: {
      userId: payload.userId,
      permissions: payload.permissions ?? [],
    },
    include: {
      user: true,
    },
  });

  return admin;
};

const getAllAdmins = async () => {
  return prisma.admin.findMany({
    include: {
      user: true,
    },
  });
};

const getSingleAdmin = async (userId: string) => {
  const admin = await prisma.admin.findUnique({
    where: { userId },
    include: { user: true },
  });

  if (!admin) {
    throw new AppError(status.NOT_FOUND, "Admin not found");
  }

  return admin;
};

const updateAdmin = async (userId: string, payload: IUpdateAdmin) => {
  const admin = await prisma.admin.update({
    where: { userId },
    data: payload,
    include: { user: true },
  });

  return admin;
};

const deleteAdmin = async (id: string, user: IRequestUser) => {
  // 🔍 find admin
  const isAdminExist = await prisma.admin.findUnique({
    where: { id },
    include: {
      user: true, // 🔥 need user role
    },
  });

  if (!isAdminExist || !isAdminExist.user) {
    throw new AppError(status.NOT_FOUND, "Admin not found");
  }

  // ❌ self delete block
  if (isAdminExist.userId === user.userId) {
    throw new AppError(status.BAD_REQUEST, "You cannot delete yourself");
  }

  const targetRole = isAdminExist.user.role;
  const currentUserRole = user.role;

  // =========================
  // 🔥 ROLE BASED LOGIC
  // =========================

  // ❌ ADMIN cannot delete SUPER_ADMIN
  if (
    currentUserRole === Role.ADMIN &&
    targetRole === Role.SUPER_ADMIN
  ) {
    throw new AppError(
      status.FORBIDDEN,
      "Admin cannot delete Super Admin"
    );
  }

  // ❌ USER cannot delete anyone
  if (currentUserRole === Role.USER) {
    throw new AppError(
      status.FORBIDDEN,
      "You are not authorized"
    );
  }

  // =========================
  // 🔥 DELETE TRANSACTION
  // =========================
  const result = await prisma.$transaction(async (tx) => {
    await tx.admin.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    await tx.user.update({
      where: { id: isAdminExist.userId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        status: userStatus.DELETED,
      },
    });

    await tx.session.deleteMany({
      where: { userId: isAdminExist.userId },
    });

    await tx.account.deleteMany({
      where: { userId: isAdminExist.userId },
    });

    return await tx.admin.findUnique({
      where: { id },
      include: { user: true },
    });
  });

  return result;
};


export const AdminService = {
  createAdmin,
  getAllAdmins,
  getSingleAdmin,
  updateAdmin,
  deleteAdmin,
};