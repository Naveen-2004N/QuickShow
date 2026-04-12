import express from 'express';
import { adminDashboarddata, getallshows, getbookings, isAdmin } from '../Control/Admincontrol.js';
import { protectAdmin } from '../middleware/auth.js';
const adminRouter = express.Router();

adminRouter.get('/isAdmin',protectAdmin , isAdmin )
adminRouter.get('/dashboarddata', protectAdmin, adminDashboarddata);
adminRouter.get('/getallshows', protectAdmin,getallshows);
adminRouter.get('/getallbookings', protectAdmin, getbookings);

export default adminRouter;
