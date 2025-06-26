import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import statcanRouter from './routes/statcan';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

mongoose.connect('mongodb://localhost:27017/statcan', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
} as any)
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

app.use('/api/statcan', statcanRouter);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 