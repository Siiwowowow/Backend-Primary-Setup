import { Router } from "express";
import { AuthRouters } from "../module/auth/auth.route";
const router=Router();
 router.use("/auth", AuthRouters);
export const IndexRoutes=router;