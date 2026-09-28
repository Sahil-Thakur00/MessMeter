module.exports = {
  MIN_VOTES: 5,          // dish is "rated" at this many votes
  GO_THRESHOLD: 0.55,    // mean Wilson lower bound >= this -> go
  SKIP_THRESHOLD: 0.30,  // < this -> skip
  MESS_TZ: process.env.MESS_TZ || 'Asia/Kolkata',
};
