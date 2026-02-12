import React, { useState, useEffect } from 'react';
import { Trophy, Star, Award, BookOpen, Users, Plus, X, Clock, CheckCircle, XCircle } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, get, push, remove, onValue } from 'firebase/database';

const ACTIVITY_TYPES = {
  module: { label: 'Complete Module', points: 10, icon: BookOpen },
  lab: { label: 'Complete Lab', points: 15, icon: Star },
  teaching: { label: 'Teach a Concept', points: 25, icon: Users },
  certification: { label: 'Earn Certification', points: 100, icon: Award },
  custom: { label: 'Custom Achievement', points: 0, icon: Star }
};

// Firebase configuration - REPLACE WITH YOUR CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyC_6IrHIFHhcbKm0xJM1xyPXuVz2V4YSck",
  authDomain: "hipe-aws-learning-leaderboard.firebaseapp.com",
  databaseURL: "https://hipe-aws-learning-leaderboard-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "hipe-aws-learning-leaderboard",
  storageBucket: "hipe-aws-learning-leaderboard.firebasestorage.app",
  messagingSenderId: "491163259682",
  appId: "1:491163259682:web:e961c1b7b4fbb5d0da0b7b",
  measurementId: "G-XHV83949J0"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

const PendingSubmissionCard = ({ submission, onApprove, onReject }) => {
  const [editPoints, setEditPoints] = useState(submission.points);
  const ActivityIcon = ACTIVITY_TYPES[submission.type].icon;
  
  return (
    <div className="p-4 bg-white rounded-lg border-2 border-yellow-200">
      <div className="flex items-start gap-3">
        <ActivityIcon className="w-5 h-5 text-blue-500 mt-1 flex-shrink-0" />
        <div className="flex-1">
          <div className="font-semibold text-gray-800">{submission.playerName}</div>
          <div className="text-sm text-gray-600 mb-2">{submission.description}</div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-500">Requested points:</span>
            <input
              type="number"
              value={editPoints}
              onChange={(e) => setEditPoints(parseInt(e.target.value))}
              className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
            />
            <button
              onClick={() => onApprove(submission.id, editPoints)}
              className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
            >
              <CheckCircle className="w-4 h-4" />
              Approve
            </button>
            <button
              onClick={() => onReject(submission.id)}
              className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
            >
              <XCircle className="w-4 h-4" />
              Reject
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function AWSLearningGame() {
  const [players, setPlayers] = useState([]);
  const [activities, setActivities] = useState([]);
  const [pendingSubmissions, setPendingSubmissions] = useState([]);
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [newActivity, setNewActivity] = useState({
    playerName: '',
    type: 'module',
    description: '',
    customPoints: 10
  });

  const ADMIN_PASSWORD = 'Yasir';

  useEffect(() => {
    // Listen for real-time updates
    const playersRef = ref(database, 'players');
    const activitiesRef = ref(database, 'activities');
    const pendingRef = ref(database, 'pending');

    onValue(playersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const playersList = Object.entries(data).map(([id, player]) => ({
          id,
          ...player
        }));
        setPlayers(playersList);
      }
    });

    onValue(activitiesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const activitiesList = Object.entries(data).map(([id, activity]) => ({
          id,
          ...activity
        }));
        setActivities(activitiesList.sort((a, b) => b.timestamp - a.timestamp));
      }
    });

    onValue(pendingRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const pendingList = Object.entries(data).map(([id, pending]) => ({
          id,
          ...pending
        }));
        setPendingSubmissions(pendingList.sort((a, b) => b.timestamp - a.timestamp));
      } else {
        setPendingSubmissions([]);
      }
    });
  }, []);

  const handleAdminLogin = () => {
    if (adminPassword === ADMIN_PASSWORD) {
      setIsAdmin(true);
      setShowAdminLogin(false);
      setAdminPassword('');
    } else {
      alert('Incorrect password');
    }
  };

  const submitForApproval = async () => {
    if (!newActivity.playerName || !newActivity.description) return;

    const submission = {
      playerName: newActivity.playerName,
      type: newActivity.type,
      description: newActivity.description,
      points: newActivity.type === 'custom' ? parseInt(newActivity.customPoints) : ACTIVITY_TYPES[newActivity.type].points,
      timestamp: Date.now(),
      status: 'pending'
    };

    const pendingRef = ref(database, 'pending');
    const newSubmissionRef = push(pendingRef);
    await set(newSubmissionRef, submission);

    setNewActivity({ playerName: '', type: 'module', description: '', customPoints: 10 });
    setShowAddActivity(false);
  };

  const approveSubmission = async (submissionId, approvedPoints) => {
    const submission = pendingSubmissions.find(s => s.id === submissionId);
    if (!submission) return;

    const activity = {
      playerName: submission.playerName,
      type: submission.type,
      description: submission.description,
      points: approvedPoints || submission.points,
      timestamp: Date.now(),
      status: 'approved'
    };

    // Add to activities
    const activitiesRef = ref(database, 'activities');
    const newActivityRef = push(activitiesRef);
    await set(newActivityRef, activity);

    // Update or create player
    const playersRef = ref(database, 'players');
    const playersSnapshot = await get(playersRef);
    const playersData = playersSnapshot.val() || {};
    
    let playerKey = null;
    for (const [key, player] of Object.entries(playersData)) {
      if (player.name === submission.playerName) {
        playerKey = key;
        break;
      }
    }

    if (playerKey) {
      const playerRef = ref(database, `players/${playerKey}`);
      const currentPlayer = playersData[playerKey];
      await set(playerRef, {
        name: currentPlayer.name,
        points: currentPlayer.points + activity.points
      });
    } else {
      const newPlayerRef = push(playersRef);
      await set(newPlayerRef, {
        name: submission.playerName,
        points: activity.points
      });
    }

    // Remove from pending
    const pendingRef = ref(database, `pending/${submissionId}`);
    await remove(pendingRef);
  };

  const rejectSubmission = async (submissionId) => {
    const pendingRef = ref(database, `pending/${submissionId}`);
    await remove(pendingRef);
  };

  const sortedPlayers = [...players].sort((a, b) => b.points - a.points);

  const getRankEmoji = (index) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `${index + 1}.`;
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-blue-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Trophy className="w-10 h-10 text-orange-500" />
            <h1 className="text-4xl font-bold text-gray-800">AWS Learning Leaderboard</h1>
          </div>
          <p className="text-gray-600">Track your team's AWS Skillbuilder progress</p>
        </div>

        {/* Admin Login Toggle */}
        <div className="flex justify-center gap-4 mb-6">
          <button
            onClick={() => setShowAddActivity(!showAddActivity)}
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg flex items-center gap-2 font-semibold transition-colors"
          >
            <Plus className="w-5 h-5" />
            Submit Achievement
          </button>
          
          {!isAdmin ? (
            <button
              onClick={() => setShowAdminLogin(!showAdminLogin)}
              className="bg-gray-700 hover:bg-gray-800 text-white px-6 py-3 rounded-lg flex items-center gap-2 font-semibold transition-colors"
            >
              Admin Login
            </button>
          ) : (
            <button
              onClick={() => setIsAdmin(false)}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 font-semibold transition-colors"
            >
              <CheckCircle className="w-5 h-5" />
              Admin Mode
            </button>
          )}
        </div>

        {/* Admin Login Form */}
        {showAdminLogin && !isAdmin && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border-2 border-gray-300 max-w-md mx-auto">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Admin Login</h3>
            <input
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAdminLogin()}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-orange-500 focus:outline-none mb-4"
              placeholder="Enter admin password"
            />
            <button
              onClick={handleAdminLogin}
              className="w-full bg-gray-700 hover:bg-gray-800 text-white px-6 py-2 rounded-lg font-semibold"
            >
              Login
            </button>
          </div>
        )}

        {/* Pending Submissions (Admin Only) */}
        {isAdmin && pendingSubmissions.length > 0 && (
          <div className="bg-yellow-50 rounded-xl shadow-lg p-6 mb-6 border-2 border-yellow-300">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Clock className="w-6 h-6 text-yellow-600" />
              Pending Approvals ({pendingSubmissions.length})
            </h3>
            <div className="space-y-3">
              {pendingSubmissions.map((submission) => (
                <PendingSubmissionCard
                  key={submission.id}
                  submission={submission}
                  onApprove={approveSubmission}
                  onReject={rejectSubmission}
                />
              ))}
            </div>
          </div>
        )}

        {/* Add Activity Form */}
        {showAddActivity && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border-2 border-orange-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">Submit Achievement</h3>
              <button onClick={() => setShowAddActivity(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="grid gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Your Name</label>
                <input
                  type="text"
                  value={newActivity.playerName}
                  onChange={(e) => setNewActivity({ ...newActivity, playerName: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-orange-500 focus:outline-none"
                  placeholder="Enter your name"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Activity Type</label>
                <select
                  value={newActivity.type}
                  onChange={(e) => setNewActivity({ ...newActivity, type: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-orange-500 focus:outline-none"
                >
                  {Object.entries(ACTIVITY_TYPES).map(([key, val]) => (
                    <option key={key} value={key}>
                      {val.label} {key !== 'custom' && `(${val.points} pts)`}
                    </option>
                  ))}
                </select>
              </div>

              {newActivity.type === 'custom' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Suggested Points</label>
                  <input
                    type="number"
                    value={newActivity.customPoints}
                    onChange={(e) => setNewActivity({ ...newActivity, customPoints: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-orange-500 focus:outline-none"
                    placeholder="Enter points"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                <input
                  type="text"
                  value={newActivity.description}
                  onChange={(e) => setNewActivity({ ...newActivity, description: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-orange-500 focus:outline-none"
                  placeholder="e.g., Completed EC2 Fundamentals module"
                />
              </div>

              <button
                onClick={submitForApproval}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg flex items-center justify-center gap-2 font-semibold transition-colors"
              >
                <Clock className="w-5 h-5" />
                Submit for Approval
              </button>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {/* Leaderboard */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Trophy className="w-6 h-6 text-orange-500" />
              Leaderboard
            </h2>
            
            {sortedPlayers.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Trophy className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p>No achievements yet. Be the first to log one!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sortedPlayers.map((player, index) => (
                  <div
                    key={player.id}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      index === 0
                        ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-300'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-bold">{getRankEmoji(index)}</span>
                        <span className="font-semibold text-lg text-gray-800">{player.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-orange-500">{player.points}</div>
                        <div className="text-xs text-gray-500">points</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Star className="w-6 h-6 text-blue-500" />
              Recent Activity
            </h2>
            
            {activities.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Star className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p>No activity yet. Start logging achievements!</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {activities.map((activity) => {
                  const ActivityIcon = ACTIVITY_TYPES[activity.type].icon;
                  return (
                    <div key={activity.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-start gap-3">
                        <ActivityIcon className="w-5 h-5 text-blue-500 mt-1 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-800">{activity.playerName}</div>
                          <div className="text-sm text-gray-600">{activity.description}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs font-semibold text-orange-500">
                              +{activity.points} pts
                            </span>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-xs text-gray-400">{formatDate(activity.timestamp)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Points Guide */}
        <div className="mt-6 bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">How to Earn Points</h3>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(ACTIVITY_TYPES).filter(([key]) => key !== 'custom').map(([key, val]) => {
              const Icon = val.icon;
              return (
                <div key={key} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Icon className="w-5 h-5 text-blue-500" />
                  <div>
                    <div className="font-semibold text-sm text-gray-800">{val.label}</div>
                    <div className="text-orange-500 font-bold">{val.points} pts</div>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-sm text-gray-600 mt-4">
            💡 You can also submit custom achievements for admin review!
          </p>
        </div>
      </div>
    </div>
  );
}
