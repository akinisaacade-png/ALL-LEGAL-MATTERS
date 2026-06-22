import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  fullName: { 
    type: String, 
    required: true, 
    trim: true 
  },
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    lowercase: true, 
    trim: true 
  },
  password: { 
    type: String, 
    required: true 
  },
  subscriptionStatus: { 
    type: String, 
    enum: ['trial', 'active', 'expired'], 
    default: 'trial' 
  },
  trialEndDate: { 
    type: Date, 
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
  }
}, { timestamps: true });

export default mongoose.models.User || mongoose.model('User', userSchema);
