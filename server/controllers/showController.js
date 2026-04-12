import axios from 'axios';
import https from 'https'; // 👈 added for IPv4 fix
import Movie from '../models/Movie.js';
import Show from '../models/Show.js';
import { inngest } from '../inngest/index.js';

// 👇 Force IPv4 to avoid ETIMEDOUT issue
const agent = new https.Agent({
  family: 4,
});

// 🎬 Get Now Playing Movies
export const getNowPlayingMovies = async (req, res) => {
  try {
    const { data } = await axios.get(
      'https://api.themoviedb.org/3/movie/now_playing',
      {
        httpsAgent: agent, // 👈 fix
        timeout: 15000, // 👈 prevent timeout error
        headers: {
          Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
        },
      }
    );

    const movies = data.results;

    res.json({ success: true, movies });
  } catch (error) {
    console.error('TMDB ERROR:', error.message); // cleaner log
    res.json({ success: false, message: error.message });
  }
};

// 🎟️ Add Show
export const addShow = async (req, res) => {
  try {
    const { movieId, showsInput, showPrice } = req.body;

    let movie = await Movie.findById(movieId);

    // 👇 If movie not in DB, fetch from TMDB
    if (!movie) {
      const [movieDetailResponse, movieCreditsResponse] = await Promise.all([
        axios.get(`https://api.themoviedb.org/3/movie/${movieId}`, {
          httpsAgent: agent, // 👈 fix
          timeout: 15000,
          headers: {
            Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
          },
        }),

        axios.get(`https://api.themoviedb.org/3/movie/${movieId}/credits`, {
          httpsAgent: agent, // 👈 fix
          timeout: 15000,
          headers: {
            Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
          },
        }),
      ]);

      const movieApiData = movieDetailResponse.data;
      const movieCreditsData = movieCreditsResponse.data;

      // 👇 Prepare movie data
      const movieDetails = {
        _id: movieId,
        title: movieApiData.title,
        overview: movieApiData.overview,
        poster_path: movieApiData.poster_path,
        backdrop_path: movieApiData.backdrop_path,
        release_date: movieApiData.release_date,
        original_language: movieApiData.original_language,
        genres: movieApiData.genres,
        casts: movieCreditsData.cast,
        tagline: movieApiData.tagline || '',
        vote_average: movieApiData.vote_average,
        runtime: movieApiData.runtime,
      };

      // 👇 Save movie in DB
      movie = await Movie.create(movieDetails);
    }

    const showsToCreate = [];

    // 👇 Process show input
    showsInput.forEach((show) => {
      const showDate = show.date;

      if (!showDate || !show.time) return; // skip invalid data

      const times = Array.isArray(show.time) ? show.time : [show.time];

      times.forEach((time) => {
        const dateTimeString = `${showDate}T${time}`;

        showsToCreate.push({
          movie: movieId,
          showDateTime: new Date(dateTimeString),
          showPrice,
          occupiedSeats: {},
        });
      });
    });

    // 👇 Insert shows into DB
    if (showsToCreate.length > 0) {
      await Show.insertMany(showsToCreate);
    }

    // 👇 Trigger event (optional feature)
    await inngest.send({
      name: 'app/show.added',
      data: {
        movieTitle: movie.title,
      },
    });

    res.json({ success: true, message: 'Show Added Successfully' });
  } catch (error) {
    console.error('ADD SHOW ERROR:', error.message);
    res.json({ success: false, message: error.message });
  }
};

// 🎥 Get All Shows
export const getShows = async (req, res) => {
  try {
    const shows = await Show.find({
      showDateTime: { $gte: new Date() },
    })
      .populate('movie')
      .sort({ showDateTime: 1 });

    // 👇 Remove duplicates
    const uniqueShows = new Set(shows.map((show) => show.movie));

    res.json({ success: true, shows: Array.from(uniqueShows) });
  } catch (error) {
    console.error('GET SHOWS ERROR:', error.message);
    res.json({ success: false, message: error.message });
  }
};

// 🎬 Get Single Movie Shows
export const getShow = async (req, res) => {
  try {
    const { movieId } = req.params;

    const shows = await Show.find({
      movie: movieId,
      showDateTime: { $gte: new Date() },
    });

    const movie = await Movie.findById(movieId);

    const dateTime = {};

    shows.forEach((show) => {
      const date = show.showDateTime.toISOString().split('T')[0];

      if (!dateTime[date]) {
        dateTime[date] = [];
      }

      // 👇 Debug log (can remove later)
      console.log(
        'Show ID:',
        show._id,
        'Type:',
        typeof show._id,
        'String:',
        show._id.toString()
      );

      dateTime[date].push({
        time: show.showDateTime,
        showId: show._id.toString(),
      });
    });

    res.json({ success: true, movie, dateTime });
  } catch (error) {
    console.error('GET SHOW ERROR:', error.message);
    res.json({ success: false, message: error.message });
  }
};