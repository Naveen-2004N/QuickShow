import express from 'express';
import {
  getFavorite,
  getUserBookings,
  updatFavorite,
} from '../controllers/userController.js';

const userRoutes = express.Router();

userRoutes.get('/bookings', getUserBookings);
userRoutes.post('/update-favorites', updatFavorite);
userRoutes.get('/favorites', getFavorite);

export default userRoutes;
