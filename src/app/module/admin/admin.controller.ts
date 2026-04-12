import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { AdminService } from "./admin.service";
import status from "http-status";

const createAdmin = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.createAdmin(req.body);

  sendResponse(res, {
    httpCode: status.CREATED,
    success: true,
    message: "Admin created successfully",
    data: result,
  });
});

const getAllAdmins = catchAsync(async (_req: Request, res: Response) => {
  const result = await AdminService.getAllAdmins();

  sendResponse(res, {
    httpCode: status.OK,
    success: true,
    message: "Admins fetched successfully",
    data: result,
  });
});

const getSingleAdmin = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.params;

  const result = await AdminService.getSingleAdmin(userId as string);

  sendResponse(res, {
    httpCode: status.OK,
    success: true,
    message: "Admin fetched successfully",
    data: result,
  });
});

const updateAdmin = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.params;

  const result = await AdminService.updateAdmin(userId as string, req.body);

  sendResponse(res, {
    httpCode: status.OK,
    success: true,
    message: "Admin updated successfully",
    data: result,
  });
});

const deleteAdmin = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const user= req.user

  await AdminService.deleteAdmin(userId as string, user);

  sendResponse(res, {
    httpCode: status.OK,
    success: true,
    message: "Admin deleted successfully",
    data: null,
  });
});

export const AdminController = {
  createAdmin,
  getAllAdmins,
  getSingleAdmin,
  updateAdmin,
  deleteAdmin,
};