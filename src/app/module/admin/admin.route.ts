import { Router } from "express";
import { AdminController } from "./admin.controller";
import { checkAuth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/enums";


const router = Router();

// 🔐 SUPER ADMIN ONLY
router.post("/", checkAuth(Role.SUPER_ADMIN), AdminController.createAdmin);

router.get("/", checkAuth(Role.SUPER_ADMIN), AdminController.getAllAdmins);

router.get(
  "/:userId",
  checkAuth(Role.SUPER_ADMIN, Role.ADMIN),
  AdminController.getSingleAdmin
);

router.patch(
  "/:userId",
  checkAuth(Role.SUPER_ADMIN),
  AdminController.updateAdmin
);

router.delete(
  "/:userId",
  checkAuth(Role.SUPER_ADMIN),
  AdminController.deleteAdmin
);

export const AdminRoutes = router;