/**
 * Hand-written Studio copy for specific demo uploads. When a project comes from one of these sets, the Story / Clips /
 * Where to post tabs show this text instead of the generic helpers. Add a new entry (keyed by group id) per upload set.
 */
export interface ClipSeed { label: string; from: number; to: number; text: string }
export interface SuggestedClip { label: string; from: number; to: number; text: string; kind: string }

/** Long videos are repurposed (YouTube video / LinkedIn post / X post) instead of cut into shorts. */
export type LongTab = "yt_video" | "linkedin" | "x";
export interface QuickAction { label: string; op: "set" | "append" | "prepend" | "chapters" | "cta" | "newTitle" | "tone" | "takeaway" | "thread"; text?: string }
export interface LongContent {
  youtube: {
    titles: string[]; description: string; descriptionVariants?: { label: string; text: string }[]; chapters?: string[]; ctas: string[];
    thumbs: string[][]; thumbNote?: string; goals?: { id: string; label: string; title: number }[];
    meta?: { category: string; categories?: string[]; contentType?: string; contentTypes?: string[]; tags: string[]; pinned?: string[] };
    /** key moments without timestamps, plus the AI's summary / analysis of the video */
    moments?: { title: string; note: string }[];
    summary?: { text: string; short: string; alt?: string };
    analysis?: [string, string][];
    topics?: string[];
    copy?: { hooks: string[]; captions: string[]; takeaway?: string };
    /** brand details for branded / sponsored videos */
    brand?: [string, string][];
  };
  linkedin: { tones: { id: string; label: string; text: string }[]; takeaways?: string[] };
  x: { styles: { id: string; label: string; text: string }[]; extra?: string[]; thread?: string[] };
  quick: Record<LongTab, QuickAction[]>;
}

export interface StudioContent {
  story: {
    note: string;
    default: string[];
    versions: string[][];
    styles: { id: string; label: string; text: string[] }[];
    actions: { id: string; label: string; text: string[] }[];
    adapt: {
      reel: { text: string[]; caption: string; cta: string; alternates?: string[] };
      short: { titles: string[]; description: string; cta: string };
      story: { sequences: string[][] };
    };
  };
  clips: {
    note: string;
    initial: ClipSeed[];
    suggested: SuggestedClip[];
    styles: string[];
    tones: string[];
    quick: string[];
    rewrites: string[];
    /** one-tap text overlay presets, grouped (e.g. concept titles, short explanations) */
    overlays?: { title: string; items: string[] }[];
    takeaway?: string;
  };
  post: {
    note: string;
    reel: { fit: string; hook: string; cta: string; button: string; caption?: string; recommended?: string[]; length?: string };
    short: { fit: string; title: string; button: string; altTitle?: string; length?: string; structure?: string[]; description?: string };
    story: { fit: string; sequence: string[]; button: string };
    /** best platform first; shown as Primary / Secondary / Tertiary */
    order?: ("yt_short" | "ig_reel" | "facebook")[];
  };
}

const PHOTO_REEL: StudioContent = {
  story: {
    note: "AI suggestion based on your video",
    default: ["The camera roll says it all.", "Different days. Same people.", "A few memories worth keeping."],
    versions: [
      ["No context. Just good people and even better memories."],
      ["Different moments.", "Same people.", "So many memories."],
      ["Random moments from the camera roll that somehow became the best memories."],
      ["A little archive of the people who made these days special."],
      ["Just a few moments with people who make life better."],
      ["Proof that the best memories rarely need a plan."],
      ["Good people, random moments, memories worth keeping."],
      ["Some moments deserve more than a spot in the gallery."],
    ],
    styles: [
      { id: "casual", label: "Casual", text: ["Just a bunch of random moments with some of my favourite people."] },
      { id: "hook", label: "Hook-focused", text: ["The camera roll has one thing to say: these were good days."] },
      { id: "story", label: "Storytelling", text: ["It started with ordinary days, turned into random moments, and somehow became memories worth keeping."] },
      { id: "minimal", label: "Minimal", text: ["Good people. Good memories."] },
      { id: "creator", label: "Creator-style", text: ["POV: your camera roll is basically a friendship archive."] },
      { id: "pro", label: "Professional", text: ["A collection of memorable moments shared with friends and loved ones."] },
    ],
    actions: [
      { id: "short", label: "Make it shorter", text: ["Good people. Great memories."] },
      { id: "punchy", label: "Make it punchier", text: ["The camera roll understood the assignment."] },
      { id: "hook", label: "Add a hook", text: ["Wait until you see who made the camera roll."] },
      { id: "casual", label: "Make it casual", text: ["Just some random moments with my favourite people."] },
      { id: "pro", label: "Make it professional", text: ["A collection of moments and memories worth revisiting."] },
      { id: "cta", label: "Add CTA", text: ["Some memories deserve to be shared.", "Tag the people who were there."] },
    ],
    adapt: {
      reel: { text: ["The camera roll says it all.", "Different days. Same people.", "A few memories worth keeping."], caption: "Random moments, favourite people, and memories that deserved their own little montage.", cta: "Tag the people who were there." },
      short: {
        titles: ["A Few Memories Worth Keeping", "The Camera Roll Tells the Story", "Some People Become Memories", "Random Moments, Favourite People", "A Little Archive of Good Days"],
        description: "A little collection of moments, people and memories that made these days special.",
        cta: "Subscribe for more moments like these.",
      },
      story: { sequences: [["A few favourite memories", "Different days.\nSame people.", "Some moments are worth keeping."], ["Life lately.", "Good people + good memories.", "That’s it. That’s the story."]] },
    },
  },
  clips: {
    note: "AI-detected moments",
    initial: [
      { label: "Opening", from: 0, to: 3, text: "The camera roll says it all." },
      { label: "Memory", from: 3, to: 9, text: "Different days. Same people." },
      { label: "Best Moment", from: 9, to: 13, text: "A few memories worth keeping." },
      { label: "Birthday / Ending", from: 13, to: 16, text: "Another memory for the archive." },
    ],
    suggested: [
      { label: "Friendship montage", from: 0, to: 9, text: "Proof that the best memories are usually unplanned.", kind: "story" },
      { label: "Best moment", from: 5, to: 9, text: "We clearly have no normal pictures.", kind: "demo" },
      { label: "Birthday", from: 12, to: 16, text: "Another memory for the camera roll.", kind: "story" },
      { label: "Ending", from: 13, to: 16, text: "Keep the people. Keep the memories.", kind: "cta" },
    ],
    styles: ["Hook", "Question", "Statement", "POV", "Story", "CTA"],
    tones: ["Casual", "Funny", "Minimal", "Emotional", "Bold", "Professional"],
    quick: ["Rewrite", "Shorten", "Make punchier", "Add context", "Remove text"],
    rewrites: ["The camera roll says it all.", "No notes. Just memories.", "Somehow these became the best days.", "Proof we were there."],
  },
  post: {
    note: "Platform recommendations",
    reel: { fit: "Strong fit for this video", hook: "The camera roll says it all.", cta: "Tag the people who were there.", button: "Prepare Reel" },
    short: { fit: "Good for short-form storytelling", title: "A Few Memories Worth Keeping", button: "Prepare Short" },
    story: { fit: "Works well as a short memory sequence", sequence: ["A few favourite memories.", "Different days. Same people.", "Some moments are worth keeping."], button: "Prepare Story" },
  },
};


const SHARED_CTA_QUICK: QuickAction = { label: "Add CTA", op: "cta" };

const lectureQuick = (A: { educational: string; concise: string; takeaways: string; beginner: string; technical: string }): Record<LongTab, QuickAction[]> => {
  const list: QuickAction[] = [
    { label: "Make more educational", op: "set", text: A.educational },
    { label: "Make more concise", op: "set", text: A.concise },
    { label: "Add key takeaways", op: "append", text: A.takeaways },
    { label: "Add timestamps", op: "chapters" },
    { label: "Make beginner-friendly", op: "set", text: A.beginner },
    { label: "Make more technical", op: "set", text: A.technical },
    SHARED_CTA_QUICK,
  ];
  return { yt_video: list, linkedin: list, x: list };
};

const VLOG_LONG: LongContent = {
  youtube: {
    titles: [
      "A Productive Day in My Life | College, Studying & Finding My Focus",
      "A Realistic College Study Day | Study With Me Vlog",
      "Come Spend a Productive Day With Me",
      "My College Study Day | Coffee, Studying & Library Vibes",
      "A Day in My Life: Studying, College & Getting Things Done",
      "Study With Me: A Productive Day in College",
      "Trying to Have a Productive Day | College Vlog",
      "One Day, Three Study Spots | College Study Vlog",
    ],
    description: "Come spend a study day with me as I try to stay productive, change up my environment, and get through the day’s work.\n\nFrom starting the morning and getting ready to study, to taking a few breaks, changing locations, and eventually settling into the library, this is a realistic look at a productive college day.\n\nIn this vlog:\n• Morning routine\n• Getting ready for a study session\n• Study setup\n• Coffee and breaks\n• Changing study locations\n• Staying focused\n• Library study session\n• A productive day in college\n\nSometimes getting work done is less about finding the perfect routine and more about simply starting.",
    descriptionVariants: [
      { label: "Creator-style", text: "A little study day vlog.\n\nCoffee, studying, changing locations when I inevitably lose focus, and ending the day at the library.\n\nNothing particularly dramatic. Just trying to have one genuinely productive day.\n\nHope this gives you a little motivation for your next study session." },
    ],
    chapters: ["00:00 Starting the Day", "00:45 Getting Ready to Study", "01:45 Setting Up", "03:00 Time to Focus", "04:30 Study Session", "06:30 Taking a Break", "07:30 Changing the Scenery", "09:00 Getting Back to Work", "10:00 Studying at the Library", "11:30 Wrapping Up"],
    ctas: [
      "If you enjoyed the vlog, subscribe for more college, study and day-in-my-life videos.",
      "Subscribe for more realistic study days and college vlogs.",
      "If you’re studying too, save this for your next study session.",
      "Let me know what your go-to study spot is.",
    ],
    thumbs: [["A PRODUCTIVE DAY"], ["STUDY WITH ME"], ["COLLEGE VLOG"], ["A DAY IN MY LIFE"], ["TRYING TO BE PRODUCTIVE"], ["STUDY DAY"]],
    thumbNote: "college + studying + library",
    goals: [{ id: "life", label: "Lifestyle", title: 0 }, { id: "search", label: "Search-friendly", title: 1 }, { id: "story", label: "Storytelling", title: 2 }, { id: "study", label: "Study-focused", title: 5 }],
    meta: {
      category: "People & Blogs",
      tags: ["study vlog", "college vlog", "day in my life", "study with me", "productive day", "college student", "student vlog", "study routine", "productive study day", "library study"],
      pinned: ["What’s your favourite place to study: home, café or library?", "What’s one thing that actually helps you stay focused?"],
    },
  },
  linkedin: {
    tones: [
      { id: "prod", label: "Productivity", text: "Productivity isn’t always about working harder. Sometimes it’s about changing your environment.\n\nIn this vlog, I documented a full study day, from getting started in the morning to working through different study environments and eventually settling into the library.\n\nOne thing I found particularly useful was changing locations when my focus started dropping.\n\nInstead of forcing myself to keep working in the same environment, moving somewhere new helped create a mental reset and made it easier to get back into the work.\n\nA simple reminder that productivity isn’t always about building the perfect routine.\n\nSometimes it’s just:\n\nStart → Focus → Reset → Keep going.\n\n#Productivity #StudentLife #Learning #StudyTips #CollegeLife" },
      { id: "pro", label: "Professional", text: "A small productivity experiment: changing the environment when focus drops.\n\nI recently documented a full study day while deliberately working from different environments.\n\nThe idea was simple: instead of forcing a long session in one place, use a change of environment as a reset point.\n\nThe result was a more flexible workflow:\n\nDeep work → break → environment change → refocus\n\nIt isn’t a revolutionary productivity system, but it is a useful reminder that sustainable productivity can come from adapting the environment rather than simply increasing the hours spent working.\n\n#Productivity #Learning #DeepWork #StudentLife" },
      { id: "student", label: "Student-focused", text: "A productive study day doesn’t always look productive from the outside.\n\nThere was coffee, changing locations, breaks, staring at a laptop for questionable amounts of time, and eventually getting the work done.\n\nWhile documenting this day, one thing stood out: having a flexible routine can be more useful than trying to follow a perfect one.\n\nWhen focus drops, changing the environment can provide a surprisingly effective reset.\n\nStill figuring out the perfect study routine, but this one worked.\n\nWhat’s one thing that helps you get back into focus?\n\n#StudentLife #Productivity #Learning #StudyRoutine" },
      { id: "learn", label: "Personal learning", text: "Still figuring out the perfect study routine, but this day taught me something.\n\nWhen my focus dropped, I changed where I was working, and it turned out to be a surprisingly effective reset.\n\nA sustainable routine doesn’t have to be perfect. It just needs to help you keep moving.\n\n#Learning #StudentLife #StudyTips" },
    ],
    takeaways: [
      "Changing your environment can act as a mental reset when concentration starts dropping.",
      "A sustainable routine doesn’t have to be perfect. It just needs to help you keep moving.",
      "Productivity is often about designing your environment, not simply increasing your working hours.",
    ],
  },
  x: {
    styles: [
      { id: "casual", label: "Casual", text: "Tried to have one genuinely productive college day.\n\nCoffee, studying, changing locations when I lost focus, and eventually ending up at the library.\n\nTurns out changing your environment is a surprisingly good reset." },
      { id: "thought", label: "Thought-provoking", text: "Sometimes the productivity hack isn’t another app, another planner or another elaborate routine.\n\nIt’s just getting up and studying somewhere else." },
      { id: "funny", label: "Funny", text: "A realistic study day:\n\n20% planning\n60% actually studying\n20% wondering why I opened my phone\n\nStill counts." },
      { id: "concise", label: "Concise", text: "Today’s productivity strategy:\n\nStudy.\nLose focus.\nChange location.\nStudy again.\n\nSomehow it worked." },
    ],
    extra: [
      "One productive day.\n\nCoffee.\nLaptop.\nLibrary.\nSeveral attempts to focus.\n\nWe got there eventually.",
      "Documented a full study day and noticed something simple:\n\nWhen focus drops, changing the environment can be a better reset than forcing yourself to keep working.\n\nSmall change, surprisingly useful.",
    ],
    thread: [
      "Spent a day trying to be genuinely productive while studying.",
      "Started with the usual setup: laptop, notes, coffee and the optimistic belief that I would stay focused for hours.",
      "That didn’t quite happen.",
      "Instead of forcing it, I changed my study environment and tried again.",
      "Eventually ended up studying at the library, which turned out to be the reset I needed.",
      "Small lesson from the day: sometimes changing where you work is enough to change how you work.",
    ],
  },
  quick: {
    yt_video: [
      { label: "Generate new title", op: "newTitle" },
      { label: "Make description shorter", op: "set", text: "Come spend a study day with me as I try to stay productive, change up my environment, and get through the day’s work. From starting the morning to studying at different locations and eventually settling into the library, here’s a realistic look at a productive college day." },
      { label: "Add chapters", op: "chapters" },
      { label: "Make more engaging", op: "set", text: "A little study day vlog.\n\nCoffee, studying, changing locations when I inevitably lose focus, and ending the day at the library.\n\nNothing particularly dramatic. Just trying to have one genuinely productive day.\n\nHope this gives you a little motivation for your next study session." },
      SHARED_CTA_QUICK,
      { label: "Make more aesthetic", op: "set", text: "☕ 📚 ✨\n\nCoffee, studying, changing locations when I inevitably lose focus, and ending the day at the library.\n\nA slow, realistic, genuinely productive day." },
    ],
    linkedin: [
      { label: "Make more professional", op: "tone", text: "pro" },
      { label: "Add key takeaway", op: "takeaway" },
      { label: "Make more concise", op: "set", text: "Productivity isn’t always about working harder. Sometimes it’s about changing your environment.\n\nI documented a full study day and found a change of scenery to be a surprisingly effective mental reset.\n\nStart → Focus → Reset → Keep going.\n\n#Productivity #StudentLife" },
      { label: "Add question", op: "append", text: "What’s one thing that helps you get back into focus?" },
      SHARED_CTA_QUICK,
    ],
    x: [
      { label: "Make punchier", op: "tone", text: "concise" },
      { label: "Make more casual", op: "tone", text: "casual" },
      { label: "Add hook", op: "prepend", text: "One productive day. Here’s how it went." },
      { label: "Make it funny", op: "tone", text: "funny" },
      { label: "Turn into thread", op: "thread" },
    ],
  },
};


/** Carnival-game explainer (legal1.mp4): the stored analysis for this video. LinkedIn / X text is composed from the same lines. */
const LEGAL1_LONG: LongContent = {
  youtube: {
    titles: [
      "The Truth Behind Carnival Games",
      "Why Carnival Games Are So Hard to Win",
      "The Trick Behind Carnival Games",
      "Think You Can Beat This Carnival Game?",
      "Carnival Games Aren’t As Simple As They Look",
      "What Makes This Carnival Game So Difficult?",
    ],
    description: "Ever wondered why carnival games can be so difficult to win? This video takes a closer look at the setup and mechanics behind one of these games and shows why it may not be as simple as it looks.",
    descriptionVariants: [
      { label: "Shorter", text: "A closer look at the mechanics behind a carnival game and why winning isn’t as easy as it seems." },
      { label: "Casual", text: "It looks easy until you actually see what’s going on. Here’s a closer look at one of those carnival games everyone thinks they can beat." },
    ],
    ctas: ["Would you still play this game?", "Would you try it?", "Would you pay to play?", "Tag someone who would definitely try this.", "What would you do?"],
    thumbs: [["WHY IS THIS SO HARD?"], ["THE TRICK BEHIND IT"], ["CARNIVAL GAME EXPOSED"], ["LOOK CLOSER"], ["WOULD YOU WIN?"], ["IT’S NOT THAT SIMPLE"]],
    meta: {
      category: "Entertainment",
      categories: ["Entertainment", "Explainer", "Educational", "Lifestyle", "Interesting Facts"],
      contentType: "Explainer",
      contentTypes: ["Explainer", "Commentary", "Educational", "Story", "Review", "Reaction", "Informational"],
      tags: ["Carnival", "Carnival Games", "Game Mechanics", "Physics", "Explainer", "Entertainment", "Games", "Interesting", "How It Works"],
    },
    moments: [
      { title: "The Setup", note: "The carnival game is introduced and looks deceptively simple." },
      { title: "The Challenge", note: "The video shows what players are actually expected to do to win." },
      { title: "The Mechanics", note: "A closer look at the setup reveals why the game is more difficult than it first appears." },
      { title: "The Breakdown", note: "The video explains the factors working against the player." },
      { title: "The Takeaway", note: "The game may look like a straightforward test of skill, but its setup plays a major role in the outcome." },
    ],
    summary: {
      text: "The video explores how a carnival game works and why it can be much harder to win than it initially appears. It breaks down the setup and mechanics of the game before showing what players are actually dealing with.",
      short: "A visual breakdown of how a carnival game works and why winning it is harder than it looks.",
    },
    analysis: [["Main subject", "Carnival game mechanics"], ["Tone", "Curious / Informational"], ["Audience", "General audience"], ["Content style", "Visual explainer"], ["Engagement potential", "High"]],
    topics: ["Carnival games", "Game mechanics", "Probability", "Physics", "Skill vs setup", "Entertainment"],
    copy: {
      hooks: ["Ever wondered why carnival games are so hard to win?", "This carnival game looks easy. It isn’t.", "Before you pay to play this game, look closer.", "Think you could beat this carnival game?", "There’s more going on here than you might think."],
      captions: ["It looks like a simple carnival game. The setup tells a different story.", "Ever wondered why carnival games are so hard to win?", "Not everything is as simple as it looks.", "Would you still play after seeing how it works?", "The game is only half the story."],
    },
  },
  linkedin: {
    tones: [
      { id: "explainer", label: "Explainer", text: "Carnival games look like a simple test of skill.\n\nThis video takes a closer look at the setup and mechanics behind one of them, and why winning may not be as easy as it seems.\n\nKey moments:\n• The Setup\n• The Challenge\n• The Mechanics\n• The Breakdown\n• The Takeaway\n\nWould you still play this game?" },
      { id: "short", label: "Short", text: "A visual breakdown of how a carnival game works and why winning it is harder than it looks.\n\nWould you still play this game?" },
    ],
  },
  x: {
    styles: [
      { id: "curious", label: "Curious", text: "Ever wondered why carnival games are so hard to win?\n\nIt looks like a simple carnival game. The setup tells a different story.\n\nWould you still play this game?" },
      { id: "concise", label: "Concise", text: "This carnival game looks easy. It isn’t.\n\nWould you pay to play?" },
    ],
  },
  quick: {
    yt_video: [
      { label: "Generate new title", op: "newTitle" },
      { label: "Make description shorter", op: "set", text: "A closer look at the mechanics behind a carnival game and why winning isn’t as easy as it seems." },
      { label: "Make description casual", op: "set", text: "It looks easy until you actually see what’s going on. Here’s a closer look at one of those carnival games everyone thinks they can beat." },
      { label: "Add CTA", op: "cta" },
    ],
    linkedin: [{ label: "Add CTA", op: "cta" }],
    x: [{ label: "Add hook", op: "prepend", text: "Think you could beat this carnival game?" }, { label: "Add CTA", op: "cta" }],
  },
};


/** Cashify branded skit (legal2.mp4). LinkedIn / X text is composed from the same lines. */
const LEGAL2_LONG: LongContent = {
  youtube: {
    titles: [
      "The Cashify Phone Deal",
      "Would You Sell Your Phone for This?",
      "The Phone Deal Gets Interesting",
      "Cashify: Turning Phones Into Cash",
      "What Would You Do With Your Old Phone?",
      "A Phone, Some Cash & One Deal",
      "The Ultimate Phone Exchange",
    ],
    description: "A light-hearted Cashify video built around a phone-and-cash exchange, with a playful interaction between the people at the table.",
    descriptionVariants: [
      { label: "Shorter", text: "A playful Cashify skit centred around phones, cash and a deal." },
      { label: "Casual", text: "A phone, some cash, and a deal that gets a little more interesting than expected." },
      { label: "Brand-focused", text: "A branded Cashify video showcasing a playful take on turning an old phone into cash." },
    ],
    ctas: ["Would you take the deal?", "What would you do?", "Would you sell your old phone?", "How much would you want for your phone?", "Tag someone who needs to upgrade.", "Would you make the exchange?"],
    thumbs: [["WOULD YOU TAKE THE DEAL?"], ["PHONE FOR CASH?"], ["WOULD YOU SELL IT?"], ["THE PHONE DEAL"], ["CASH FOR YOUR PHONE"], ["TAKE THE DEAL?"], ["PHONE IN. CASH OUT."]],
    meta: {
      category: "Entertainment",
      categories: ["Entertainment", "Branded Content", "Comedy", "Lifestyle", "Promotional", "Technology"],
      contentType: "Branded Entertainment",
      contentTypes: ["Branded Entertainment", "Promotional", "Comedy Skit", "Product Promotion", "Creator Collaboration", "Advertisement"],
      tags: ["Cashify", "Smartphones", "Phones", "Phone Exchange", "Technology", "Branded Content", "Entertainment", "Comedy", "Lifestyle", "Phone Upgrade"],
    },
    moments: [
      { title: "The Setup", note: "The Cashify-branded setting is established and the phone-and-cash interaction begins." },
      { title: "The Deal", note: "The characters begin discussing and handling the phone and money involved in the exchange." },
      { title: "The Reaction", note: "The interaction becomes more animated as the characters react to the situation." },
      { title: "The Phone", note: "The phone becomes the centre of the negotiation and visual interaction." },
      { title: "The Cash", note: "Cash is prominently shown as part of the deal." },
      { title: "The Payoff", note: "The video wraps up the comedic interaction while keeping the Cashify branding visible." },
    ],
    summary: {
      text: "The video presents a playful interaction around a phone and a cash deal, with Cashify positioned at the centre of the exchange. The scene uses humour and character interaction to present the brand and its phone-related service.",
      short: "A comedic branded skit built around a phone-for-cash exchange.",
      alt: "A chaotic little phone deal involving Cashify, some cash, and a few unexpected reactions.",
    },
    analysis: [
      ["Main subject", "Phone exchange / Cashify"], ["Content category", "Branded Entertainment"], ["Tone", "Playful / Comedic"], ["Format", "Short-form skit"],
      ["Audience", "General / Smartphone users"], ["Brand detected", "Cashify"], ["Topics detected", "Smartphones, phone exchange, cash, upgrading phones"], ["Engagement potential", "High"],
      ["Why", "A simple curiosity-driven premise, visible product interaction and a clear question around the phone-for-cash exchange."],
    ],
    topics: ["Smartphones", "Phone Exchange", "Cash", "Technology"],
    brand: [["Brand", "Cashify"], ["Brand integration", "Central"], ["Integration type", "Branded skit / promotional content"], ["Product focus", "Phone resale / exchange"], ["Branding visibility", "High"]],
    copy: {
      hooks: ["Would you sell your phone for this deal?", "What would you do if someone offered you cash for your phone?", "This phone deal got interesting.", "Your old phone might be worth more than you think.", "Would you take the deal?", "Phone in. Cash out.", "Things got interesting when the phone hit the table."],
      captions: ["A phone, some cash, and a deal worth thinking about.", "Would you take the deal?", "Phone in. Cash out.", "What would you do with your old phone?", "The negotiation got interesting.", "Your old phone could be worth more than you think.", "Would you make the exchange?"],
      takeaway: "Your old phone could be worth more than you think.",
    },
  },
  linkedin: {
    tones: [
      { id: "brand", label: "Brand-focused", text: "A playful take on turning an old phone into cash.\n\nThis branded Cashify video uses a light-hearted phone-and-cash exchange to showcase the brand’s phone resale service.\n\nYour old phone could be worth more than you think.\n\nWould you take the deal?" },
      { id: "short", label: "Short", text: "A comedic branded skit built around a phone-for-cash exchange.\n\nWould you take the deal?" },
    ],
  },
  x: {
    styles: [
      { id: "curious", label: "Curious", text: "Would you sell your phone for this deal?\n\nA phone, some cash, and a deal worth thinking about.\n\nWould you take the deal?" },
      { id: "concise", label: "Concise", text: "Phone in. Cash out.\n\nWould you take the deal?" },
    ],
  },
  quick: {
    yt_video: [
      { label: "Generate new title", op: "newTitle" },
      { label: "Make description shorter", op: "set", text: "A playful Cashify skit centred around phones, cash and a deal." },
      { label: "Make description casual", op: "set", text: "A phone, some cash, and a deal that gets a little more interesting than expected." },
      { label: "Make description brand-focused", op: "set", text: "A branded Cashify video showcasing a playful take on turning an old phone into cash." },
      { label: "Add CTA", op: "cta" },
    ],
    linkedin: [{ label: "Add CTA", op: "cta" }],
    x: [{ label: "Add hook", op: "prepend", text: "Would you sell your phone for this deal?" }, { label: "Add CTA", op: "cta" }],
  },
};

const LECTURE_A = {
      educational: "This lecture walks through a complete Genetic Algorithm example, connecting binary encoding, fitness evaluation, selection, crossover and mutation into one continuous process.",
      concise: "A step-by-step Genetic Algorithm example covering fitness, selection, crossover and mutation.",
      takeaways: "Key takeaways:\n1. Encode candidate solutions.\n2. Evaluate their fitness.\n3. Select stronger candidates.\n4. Apply crossover.\n5. Introduce variation through mutation.\n6. Generate the next population.",
      beginner: "Think of a Genetic Algorithm as repeatedly keeping better solutions, combining them, and introducing small changes to search for an even better solution.",
      technical: "The lecture demonstrates the evolutionary optimisation pipeline from chromosome representation and fitness evaluation through probabilistic selection, crossover and mutation.",
};

const LECTURE_LONG: LongContent = {
    youtube: {
      titles: [
        "Genetic Algorithm Solved Example | Selection, Crossover & Mutation",
        "Genetic Algorithms Explained With a Complete Solved Example",
        "Genetic Algorithm Step-by-Step | Encoding, Fitness, Selection, Crossover & Mutation",
        "Learn Genetic Algorithms Through One Complete Numerical Example",
        "Genetic Algorithm Tutorial: From Initial Population to Mutation",
      ],
      description: "In this lecture, we solve a Genetic Algorithm example step by step, starting with binary encoding and the initial population.\n\nWe then calculate the fitness of each solution, determine selection probabilities, build the mating pool, and apply crossover and mutation to generate the next population.\n\nTopics covered:\n• Genetic Algorithm fundamentals\n• Binary encoding\n• Initial population\n• Fitness calculation\n• Selection probability\n• Mating pool\n• Crossover\n• Mutation\n• Generating the next population\n\nThis walkthrough is designed to make the numerical side of Genetic Algorithms easier to follow.",
      chapters: ["00:00 Introduction & Problem", "00:55 Binary Encoding", "01:45 Initial Population", "03:00 Fitness Calculation", "06:30 Selection Probability", "07:20 Mating Pool", "08:30 Crossover", "10:15 Mutation", "11:50 New Population & Conclusion"],
      ctas: ["If this walkthrough helped you understand Genetic Algorithms, subscribe for more step-by-step AI and ML tutorials."],
      thumbs: [["GENETIC ALGORITHM", "SOLVED EXAMPLE"], ["SELECTION → CROSSOVER → MUTATION"], ["GENETIC ALGORITHM, STEP BY STEP"]],
      goals: [{ id: "edu", label: "Educational", title: 0 }, { id: "search", label: "Search-friendly", title: 1 }, { id: "beginner", label: "Beginner-friendly", title: 3 }, { id: "tech", label: "Technical", title: 2 }],
    },
    linkedin: {
      tones: [
        { id: "edu", label: "Educational", text: "Genetic Algorithms become much easier to understand when you work through an actual example.\n\nIn this lecture, I walk through a complete Genetic Algorithm example step by step, covering:\n• Binary encoding\n• Initial population\n• Fitness calculation\n• Selection probability\n• Mating pool formation\n• Crossover\n• Mutation\n• Generation of the next population\n\nThe goal is to understand not just what each stage does, but how the calculations connect together to produce the next generation of solutions.\n\nThis is especially useful when learning Genetic Algorithms for AI/ML coursework or preparing for numerical problems.\n\nKey takeaway:\nGenetic Algorithms repeatedly select, combine and slightly modify candidate solutions to move towards better solutions.\n\n#ArtificialIntelligence #MachineLearning #GeneticAlgorithms #AI #Algorithms #ComputerScience" },
        { id: "pro", label: "Professional", text: "A practical walkthrough of a Genetic Algorithm.\n\nThis lecture demonstrates how a population of candidate solutions evolves through successive stages of:\n\n1. Encoding\n2. Fitness evaluation\n3. Selection\n4. Crossover\n5. Mutation\n\nThe emphasis is on the numerical reasoning behind each stage rather than treating the algorithm as a collection of abstract definitions.\n\nThe complete walkthrough is available in the accompanying video." },
        { id: "student", label: "Student-focused", text: "Trying to understand Genetic Algorithms? Start with one complete example.\n\nInstead of treating selection, crossover and mutation as isolated concepts, this walkthrough connects them into one complete numerical example.\n\nWe go from:\nPopulation → Fitness → Selection → Crossover → Mutation → New Population\n\nSeeing the entire pipeline makes the algorithm much easier to reason about.\n\nA useful one to revisit before an AI/ML exam or while building a foundation in evolutionary algorithms.\n\n#MachineLearning #ArtificialIntelligence #GeneticAlgorithms #ComputerScience" },
        { id: "tech", label: "Technical", text: "A Genetic Algorithm, viewed as an evolutionary optimisation pipeline.\n\nThis lecture works through one numerical example: chromosome representation, fitness evaluation, probabilistic selection, crossover and mutation, ending with the next population.\n\n#GeneticAlgorithms #EvolutionaryComputation #MachineLearning" },
      ],
    },
    x: {
      styles: [
        { id: "concise", label: "Concise", text: "Genetic Algorithms make a lot more sense when you see the entire process in one example.\n\nPopulation → Fitness → Selection → Crossover → Mutation → New Generation.\n\nHere’s a step-by-step walkthrough of the complete example." },
        { id: "tech", label: "Technical", text: "A Genetic Algorithm in one pipeline:\n\nInitial population\n↓\nFitness evaluation\n↓\nSelection\n↓\nCrossover\n↓\nMutation\n↓\nNew population\n\nWalkthrough with the actual numerical example." },
        { id: "discussion", label: "Discussion", text: "If Genetic Algorithms feel like a pile of disconnected terms, this is the missing piece.\n\nOne complete example showing how:\nSelection → Crossover → Mutation\nactually work together." },
        { id: "thread", label: "Thread-style", text: "1/ Genetic Algorithms, explained through one solved example.\n\n2/ Binary encoding → fitness → selection → mating pool → crossover → mutation.\n\n3/ No hand-waving. Just the actual calculations." },
      ],
    },
    quick: lectureQuick(LECTURE_A),
  };

const LECTURE: StudioContent = {
  story: {
    note: "AI suggestion based on your video",
    default: ["A step-by-step Genetic Algorithm example, from encoding the population to crossover and mutation.", "Perfect for understanding how the calculations actually work."],
    versions: [
      ["Confused by Genetic Algorithms?", "Here’s a complete solved example, step by step."],
      ["From binary encoding to mutation, here’s how a Genetic Algorithm works through one complete example."],
      ["One solved example to understand Genetic Algorithms without getting lost in the theory."],
      ["Let’s solve a Genetic Algorithm example from start to finish."],
      ["A complete walkthrough of selection, fitness calculation, crossover and mutation using one example."],
      ["Genetic Algorithms finally explained through an actual numerical example."],
      ["If Genetic Algorithms feel confusing, follow this example from the initial population all the way to mutation."],
      ["Theory is one thing. Let’s actually solve a Genetic Algorithm."],
    ],
    styles: [
      { id: "casual", label: "Casual", text: ["Let’s actually solve a Genetic Algorithm instead of just talking about the theory."] },
      { id: "hook", label: "Hook-focused", text: ["Still confused about Genetic Algorithms? This one solved example walks through the entire process."] },
      { id: "story", label: "Storytelling", text: ["We start by encoding the possible solutions, calculate their fitness, select the mating pool, perform crossover, and finish with mutation."] },
      { id: "minimal", label: "Minimal", text: ["Genetic Algorithm, solved step by step."] },
      { id: "creator", label: "Creator-style", text: ["POV: your Genetic Algorithm notes finally start making sense."] },
      { id: "pro", label: "Professional", text: ["A complete worked example demonstrating the major stages of a Genetic Algorithm."] },
    ],
    actions: [
      { id: "short", label: "Make it shorter", text: ["A complete Genetic Algorithm example, solved step by step."] },
      { id: "punchy", label: "Make it punchier", text: ["Genetic Algorithms. One example. Every step."] },
      { id: "hook", label: "Add a hook", text: ["Can you solve this Genetic Algorithm before the final mutation?"] },
      { id: "casual", label: "Make it casual", text: ["Let’s work through a Genetic Algorithm example together."] },
      { id: "pro", label: "Make it professional", text: ["Step-by-step numerical implementation of a Genetic Algorithm."] },
      { id: "cta", label: "Add CTA", text: ["Save this for your next Genetic Algorithm revision."] },
    ],
    adapt: {
      reel: {
        text: ["Confused by Genetic Algorithms?", "Here’s the whole process in one example."],
        caption: "From binary encoding and fitness calculation to selection, crossover and mutation, here’s a complete Genetic Algorithm example.",
        cta: "Save this for your next revision session.",
        alternates: ["Genetic Algorithms in one solved example.", "This is how crossover and mutation actually work.", "The easiest way to understand Genetic Algorithms? Follow one example.", "If your Genetic Algorithm notes look like this, watch this.", "Selection → crossover → mutation. Here’s what actually happens."],
      },
      short: {
        titles: ["Genetic Algorithm Solved Example", "Genetic Algorithms Explained With One Example", "How Genetic Algorithms Actually Work", "Genetic Algorithm: Selection, Crossover & Mutation", "Solve a Genetic Algorithm Step by Step", "Genetic Algorithm in 60 Seconds"],
        description: "A quick breakdown of a solved Genetic Algorithm example, covering encoding, fitness calculation, selection, crossover and mutation.",
        cta: "Subscribe for more step-by-step AI and algorithm tutorials.",
      },
      story: { sequences: [["Confused by Genetic Algorithms?", "Start with the population.\nCalculate fitness.\nSelect the fittest solutions.", "Then:\nCrossover → Mutation → New population"], ["Genetic Algorithm\n=\nSelection + Crossover + Mutation", "Here’s a complete solved example."]] },
    },
  },
  clips: {
    note: "AI-detected moments",
    initial: [
      { label: "Problem Setup", from: 0, to: 55, text: "Genetic Algorithm solved example: maximising f(x) = x²." },
      { label: "Encoding Technique", from: 55, to: 105, text: "Representing possible solutions using 5-bit binary strings." },
      { label: "Initial Population", from: 105, to: 180, text: "Selecting the initial population for the Genetic Algorithm." },
      { label: "Fitness Calculation", from: 180, to: 390, text: "Calculating fitness using f(x) = x²." },
      { label: "Selection Probability", from: 390, to: 440, text: "Converting fitness values into selection probabilities." },
      { label: "Mating Pool", from: 470, to: 510, text: "Selecting the individuals for the mating pool." },
      { label: "Crossover", from: 510, to: 615, text: "Creating new solutions through crossover." },
      { label: "Mutation", from: 615, to: 758.155, text: "Applying mutation to generate the next population." },
    ],
    suggested: [
      { label: "Best Hook", from: 0, to: 25, text: "Confused by Genetic Algorithms? Let’s solve one from start to finish.", kind: "hook" },
      { label: "Fitness Calculation", from: 180, to: 210, text: "Fitness tells us how good each solution is.", kind: "explain" },
      { label: "Selection", from: 390, to: 435, text: "The better the fitness, the higher the probability of being selected.", kind: "explain" },
      { label: "Crossover", from: 510, to: 550, text: "Now we combine parts of the selected solutions.", kind: "explain" },
      { label: "Mutation", from: 615, to: 650, text: "Mutation introduces a small change to the solution.", kind: "explain" },
      { label: "Final Result", from: 710, to: 758.155, text: "After crossover and mutation, we have our new population.", kind: "cta" },
    ],
    styles: ["Concept", "Definition", "Formula", "Step", "Example", "Key takeaway", "CTA"],
    tones: ["Educational", "Exam-focused", "Simple", "Technical", "Minimal", "Creator-style"],
    quick: ["Simplify", "Shorten", "Explain formula", "Add key takeaway", "Add chapter title", "Add CTA", "Remove text"],
    rewrites: ["A complete Genetic Algorithm example, step by step.", "Follow one example from start to finish.", "Every stage of a Genetic Algorithm, solved."],
    takeaway: "Higher fitness = better solution.",
    overlays: [
      { title: "Concept overlays", items: ["Binary Encoding", "Initial Population", "Calculate Fitness", "Selection Probability", "Build the Mating Pool", "Crossover", "Mutation", "New Generation"] },
      { title: "Short explanations", items: ["Higher fitness = better solution", "Fitness determines selection probability", "Select the stronger candidates", "Crossover combines parent solutions", "Mutation introduces variation", "Repeat to improve the population"] },
    ],
  },
  post: {
    note: "Platform recommendations",
    order: ["yt_short", "ig_reel", "facebook"],
    reel: { fit: "Good for a quick teaser", recommended: ["Hook", "Fitness calculation", "Crossover", "Mutation"], length: "30–45 sec", hook: "Confused by Genetic Algorithms? Let’s solve one from start to finish.", caption: "Selection, crossover and mutation explained using one simple solved example.", cta: "Save this for your next AI/ML revision.", button: "Prepare Reel" },
    short: { fit: "Strongest platform for this video", title: "Genetic Algorithm Solved Example | Selection, Crossover & Mutation", altTitle: "Genetic Algorithm Explained With One Example", length: "45–60 sec", structure: ["Hook", "Initial population", "Fitness", "Selection", "Crossover", "Mutation"], description: "A step-by-step breakdown of a Genetic Algorithm solved example covering binary encoding, fitness calculation, selection, crossover and mutation.", button: "Prepare Short" },
    story: { fit: "Lightweight recap sequence", sequence: ["Genetic Algorithms,\nbut actually solved.", "1. Create the population\n2. Calculate fitness\n3. Select candidates", "4. Crossover\n5. Mutation\n6. New generation"], button: "Prepare Story" },
  },
};

const BY_GROUP: Record<string, StudioContent> = { "photo-reel": PHOTO_REEL, "lecture-merge": LECTURE };
export type LongContentId = string;
export const longContentFor = (groupId?: string): LongContent | undefined => (groupId ? ({ "lecture-merge": LECTURE_LONG, "vlog-merge": VLOG_LONG, legal1: LEGAL1_LONG, legal2: LEGAL2_LONG } as Record<string, LongContent>)[groupId] : undefined);
export const studioContentFor = (groupId?: string): StudioContent | undefined => (groupId ? BY_GROUP[groupId] : undefined);
