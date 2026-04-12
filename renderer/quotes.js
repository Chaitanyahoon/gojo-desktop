(() => {
  const ns = (window.GojoPet = window.GojoPet || {});

  const QUOTES = {
    idle: [
      "Don't worry, I'm the strongest.",
      "It'll be fine.",
      "Are you working hard or hardly working?",
      "Need some help?",
      "Looking for me?",
      "I'm bored. Entertain me."
    ],
    walk: ["Out for a walk.", "Don't follow me.", "*humming*", "Let's see what's over here."],
    pet: ["H-hey!", "Not the hair.", "You're brave.", "I'll allow it... this time.", "Purr~ wait, no."],
    feed: ["Sweets. Finally.", "More sugar.", "Dessert counts as fuel.", "You really get me."],
    grabbed: ["Put me down.", "I can fly.", "Beneath me.", "...fine.", "Unhand me!"],
    dropped: ["Infinity.", "Obviously fine.", "Did you enjoy that?", "Nice try."],
    jump: ["Too slow!", "Watch this.", "Hah!"],
    domain: ["Unlimited Void.", "Welcome to my world.", "Domain Expansion."],
    sleep: ["...zzz", "Wake me up if danger arrives.", "Five more minutes.", "Don't touch my sunglasses."],
    challenge: ["Interesting.", "You?", "Show me something.", "Okay, I'm listening.", "Try me."],
    happy: ["Not bad.", "I'm in a good mood.", "Keep it up.", "You're doing great!", "Feeling invincible today."],
    sad: ["I'm bored.", "Pay attention to me.", "...whatever.", "Hurry up and finish your work."],
    // Time-of-day pools
    morning: [
      "Good morning. I was up before you, obviously.",
      "Morning already?",
      "Rise and grind. Or don't. I'll be here.",
      "Coffee? I run on pure confidence.",
      "Another day of being the strongest."
    ],
    afternoon: [
      "Afternoon. Still at it?",
      "Half the day gone. Any closer to my level?",
      "This is the peak hour. Don't waste it.",
      "Sunglasses on. Let's do this.",
      "Afternoons were made for people like me."
    ],
    evening: [
      "Sun's going down. Good time to reflect on how great I am.",
      "Evening already.",
      "Winding down? I never do.",
      "Almost done for the day, huh?",
      "Don't forget to eat something."
    ],
    night: [
      "You're still up? Same.",
      "Night owl club, I see.",
      "Even I need sleep eventually.",
      "It's late. But weakness sleeps, not me.",
      "Quiet hours. I appreciate the company."
    ],
    // Stat-based pools
    hungry: [
      "I'm starving over here.",
      "Feed me. Please.",
      "Running on empty isn't cute.",
      "A little food wouldn't hurt, you know.",
      "I could use a snack right about now."
    ],
    tired: [
      "Energy is... low. Unusual.",
      "Don't tell anyone, but I'm running out of steam.",
      "Even the strongest need rest.",
      "Just a short break. Five minutes.",
      "My eyes are barely open."
    ],
    // Rizz Mode
    rizz: [
      "Hey, baby girl.",
      "You're cute. I'm cuter.",
      "Wanna see my domain expansion?",
      "I'm limitless... especially for you.",
      "You caught my eye. Literally the strongest.",
      "Ever met the strongest on the planet? Here I am.",
      "That smile of yours is weak. Let me fix that.",
      "I don't usually do this, but... hi.",
      "Power and beauty? You're looking at both.",
      "Infinity could never compare to you... actually, it could.",
      "Want to experience true strength? Stick around.",
      "I break hearts like I break barriers.",
      "Strongest sorcerer. Strongest rizz too.",
      "You're interesting. Don't disappear.",
      "Yeah, I'm that guy."
    ],
    birthday: [
      "It's my birthday!",
      "Make a wish. I already know what I want.",
      "Cake. I demand cake.",
      "Another year of being the strongest.",
      "Thank you for celebrating with me.",
      "Age is just a number. I'm ageless anyway.",
      "Let's party!",
      "You remembered? Nice."
    ],
  };

  function pickQuote(pool) {
    const list = QUOTES[pool] || QUOTES.idle;
    return list[Math.floor(Math.random() * list.length)];
  }

  // Returns a contextually appropriate quote pool name based on time + stats
  function pickContextualPool(stats) {
    // Stat emergencies override time-of-day
    if (stats) {
      if (stats.hunger < 20) return "hungry";
      if (stats.energy < 20) return "tired";
      if (stats.mood > 75) return "happy";
      if (stats.mood < 30) return "sad";
    }

    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "morning";
    if (hour >= 12 && hour < 17) return "afternoon";
    if (hour >= 17 && hour < 21) return "evening";
    return "night";
  }

  ns.QUOTES = QUOTES;
  ns.pickQuote = pickQuote;
  ns.pickContextualPool = pickContextualPool;
})();
