import express from 'express';
import { addShow, getNowPlayingMovies, getShow, getShows } from '../controllers/showController.js';
import { protectAdmin } from '../middleware/auth.js';

const ShowRouter = express.Router();

ShowRouter.get('/now-playing',protectAdmin, getNowPlayingMovies);
ShowRouter.post('/add',protectAdmin ,addShow);

ShowRouter.get('/all',getShows)
ShowRouter.get('/:movieId',getShow)

export default ShowRouter;
