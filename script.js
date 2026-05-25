const dailyGoal = 2000;
let totalCalories = 0, burnedCalories = 0, activeMinutes = 0, entries = 0;
let log = [], workoutsLog = [];
let currentUser = '', users = {};

try { const s = localStorage.getItem('calx_users'); if (s) users = JSON.parse(s); } catch(e) {}

const routines = {
  hiit: { name:"HIIT Cardio Blast", burn:240, duration:4, steps:[
    {name:"Jumping Jacks",duration:30,instruct:"Keep a quick pace, land softly on your toes!",type:"work"},
    {name:"Rest",duration:15,instruct:"Catch your breath and prepare for mountain climbers.",type:"rest"},
    {name:"Mountain Climbers",duration:30,instruct:"Keep your core tight and pump your knees fast!",type:"work"},
    {name:"Rest",duration:15,instruct:"Rest up. Burpees are next!",type:"rest"},
    {name:"Burpees",duration:30,instruct:"Full extension at the top. Push your limits!",type:"work"},
    {name:"Rest",duration:15,instruct:"One more exercise to go! Catch your breath.",type:"rest"},
    {name:"High Knees",duration:30,instruct:"Pump your arms and drive knees up to hip height!",type:"work"}
  ]},
  core: { name:"Core Strength Builder", burn:120, duration:4, steps:[
    {name:"Forearm Plank",duration:30,instruct:"Keep your body in a straight line, engage your abs!",type:"work"},
    {name:"Rest",duration:15,instruct:"Rest up. Prepare for bicycle crunches.",type:"rest"},
    {name:"Bicycle Crunches",duration:30,instruct:"Elbow to opposite knee. Control your rotations!",type:"work"},
    {name:"Rest",duration:15,instruct:"Deep breath. Russian twists are up next.",type:"rest"},
    {name:"Russian Twists",duration:30,instruct:"Lean back slightly and twist side-to-side.",type:"work"},
    {name:"Rest",duration:15,instruct:"Prepare for the final stretch: Leg Raises.",type:"rest"},
    {name:"Leg Raises",duration:30,instruct:"Keep lower back flat against floor, lower legs slowly.",type:"work"}
  ]},
  upper: { name:"Upper Body Tone", burn:180, duration:5, steps:[
    {name:"Standard Push-ups",duration:30,instruct:"Chest to floor, push up strong! Drop to knees if needed.",type:"work"},
    {name:"Rest",duration:15,instruct:"Rest. Pike push-ups are next for shoulder focus.",type:"rest"},
    {name:"Pike Push-ups",duration:30,instruct:"Elevate your hips and lower crown of head to floor.",type:"work"},
    {name:"Rest",duration:15,instruct:"Rest up. Find a chair or use floor for dips.",type:"rest"},
    {name:"Bench Dips",duration:30,instruct:"Bend elbows to 90 degrees, press up through palms.",type:"work"},
    {name:"Rest",duration:15,instruct:"Prepare for shoulder taps next.",type:"rest"},
    {name:"Shoulder Taps",duration:30,instruct:"Hold high plank, tap alternate shoulders without swaying hips.",type:"work"},
    {name:"Rest",duration:15,instruct:"Final move: Arm Circles to flush muscles.",type:"rest"},
    {name:"Arm Circles",duration:30,instruct:"Small, tight circles forwards. Keep shoulders active!",type:"work"}
  ]},
  lower: { name:"Lower Body Sculpt", burn:200, duration:4, steps:[
    {name:"Bodyweight Squats",duration:30,instruct:"Weight in heels, hips back and down. Keep chest up!",type:"work"},
    {name:"Rest",duration:15,instruct:"Take a break. Lunges are next.",type:"rest"},
    {name:"Alternating Lunges",duration:30,instruct:"Step forward, sink hips. Do not let front knee pass toes.",type:"work"},
    {name:"Rest",duration:15,instruct:"Rest. Glute bridges are up next.",type:"rest"},
    {name:"Glute Bridges",duration:30,instruct:"Drive hip up, squeeze glutes at the top of motion.",type:"work"},
    {name:"Rest",duration:15,instruct:"Get ready for calf raises to finish lower body.",type:"rest"},
    {name:"Calf Raises",duration:30,instruct:"Push up to balls of toes, squeeze calves and hold.",type:"work"}
  ]}
};

let audioCtx = null;
function playBeep(freq, dur) {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.connect(g); g.connect(audioCtx.destination);
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.08, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
    o.start(audioCtx.currentTime); o.stop(audioCtx.currentTime + dur);
  } catch(e) {}
}

// ─── SESSION STATE ────────────────────────────────────────────────────────────
let ss = { routineId:null, active:false, stepIndex:0, timeLeft:0, stepDuration:0, paused:false, preparing:false, interval:null };

function getUserDataKey() { return `calx_data_${currentUser.toLowerCase().replace(/\s+/g,'_')}`; }
function saveUserData() {
  if (!currentUser) return;
  localStorage.setItem(getUserDataKey(), JSON.stringify({totalCalories,burnedCalories,activeMinutes,entries,log,workoutsLog}));
}
function loadUserData() {
  if (!currentUser) return;
  const s = localStorage.getItem(getUserDataKey());
  if (s) { try { const d=JSON.parse(s); totalCalories=d.totalCalories||0; burnedCalories=d.burnedCalories||0; activeMinutes=d.activeMinutes||0; entries=d.entries||0; log=d.log||[]; workoutsLog=d.workoutsLog||[]; } catch(e) { resetAllLocal(); } }
  else resetAllLocal();
  updateUI();
}
function resetAllLocal() { totalCalories=0; burnedCalories=0; activeMinutes=0; entries=0; log=[]; workoutsLog=[]; }

function showPage(id) {
  document.querySelectorAll('.page').forEach(p=>{p.classList.remove('active');p.classList.add('hidden');});
  const el=document.getElementById(id); el.classList.remove('hidden'); requestAnimationFrame(()=>el.classList.add('active'));
}
function switchTrackerTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c=>c.classList.remove('active'));
  if(tab==='nutrition'){document.getElementById('nutritionTabBtn').classList.add('active');document.getElementById('nutritionTabContent').classList.add('active');}
  else if(tab==='workout'){document.getElementById('workoutTabBtn').classList.add('active');document.getElementById('workoutTabContent').classList.add('active');}
  else if(tab==='diet'){document.getElementById('dietTabBtn').classList.add('active');document.getElementById('dietTabContent').classList.add('active');}
}
function togglePass(id,btn) { const i=document.getElementById(id); const t=i.type==='text'; i.type=t?'password':'text'; btn.querySelector('i').className=t?'ti ti-eye':'ti ti-eye-off'; }
function setErr(fid,eid,show) { document.getElementById(fid).classList.toggle('err',show); document.getElementById(eid).classList.toggle('show',show); }

function doLogin() {
  const email=document.getElementById('loginEmail').value.trim(), pass=document.getElementById('loginPass').value;
  let ok=true;
  const eok=/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); setErr('loginEmail','emailErr',!eok); if(!eok)ok=false;
  const pok=pass.length>=6; setErr('loginPass','passErr',!pok); if(!pok)ok=false;
  if(!ok)return;
  if(!users[email]){setErr('loginEmail','emailErr',true);document.getElementById('emailErr').textContent='No account found with this email.';return;}
  if(users[email].pass!==pass){setErr('loginPass','passErr',true);document.getElementById('passErr').textContent='Incorrect password.';return;}
  currentUser=users[email].name; document.getElementById('userNameDisplay').textContent=currentUser; loadUserData(); showPage('trackerPage');
}
function doSignup() {
  const name=document.getElementById('signupName').value.trim(), email=document.getElementById('signupEmail').value.trim(), pass=document.getElementById('signupPass').value;
  let ok=true;
  setErr('signupName','nameErr',!name); if(!name)ok=false;
  const eok=/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); setErr('signupEmail','signupEmailErr',!eok); if(!eok)ok=false;
  const pok=pass.length>=6; setErr('signupPass','signupPassErr',!pok); if(!pok)ok=false;
  if(!ok)return;
  users[email]={name,pass}; try{localStorage.setItem('calx_users',JSON.stringify(users));}catch(e){}
  currentUser=name; document.getElementById('userNameDisplay').textContent=currentUser; resetAllLocal(); saveUserData(); updateUI(); showPage('trackerPage');
}
function doLogout() { currentUser=''; document.getElementById('loginEmail').value=''; document.getElementById('loginPass').value=''; showPage('loginPage'); }

document.addEventListener('keydown',e=>{
  if(e.key==='Enter'&&document.getElementById('trackerPage').classList.contains('active')) {
    document.getElementById('nutritionTabContent').classList.contains('active')?addCalories():addCustomWorkout();
  }
});

function addCalories() {
  const inp=document.getElementById('calorieInput'); const cal=Number(inp.value);
  if(cal<=0||isNaN(cal)){inp.classList.add('err');setTimeout(()=>inp.classList.remove('err'),800);return;}
  totalCalories+=cal; entries++; log.push(cal); saveUserData(); updateUI(); inp.value=''; inp.focus();
}
function deleteCalorieEntry(idx) { totalCalories-=log[idx]; log.splice(idx,1); entries--; saveUserData(); updateUI(); }
function addCustomWorkout() {
  const ni=document.getElementById('customWorkoutName'), mi=document.getElementById('customWorkoutMin'), ki=document.getElementById('customWorkoutKcal');
  const name=ni.value.trim(), mins=Number(mi.value), kcal=Number(ki.value);
  let ok=true;
  if(!name){ni.classList.add('err');setTimeout(()=>ni.classList.remove('err'),800);ok=false;}
  if(mins<=0||isNaN(mins)){mi.classList.add('err');setTimeout(()=>mi.classList.remove('err'),800);ok=false;}
  if(kcal<=0||isNaN(kcal)){ki.classList.add('err');setTimeout(()=>ki.classList.remove('err'),800);ok=false;}
  if(!ok)return;
  burnedCalories+=kcal; activeMinutes+=mins; workoutsLog.push({name,duration:mins,burn:kcal}); saveUserData(); updateUI();
  ni.value=''; mi.value=''; ki.value='';
}
function deleteWorkoutEntry(idx) { burnedCalories-=workoutsLog[idx].burn; activeMinutes-=workoutsLog[idx].duration; workoutsLog.splice(idx,1); saveUserData(); updateUI(); }

// ─── TIMER ENGINE ─────────────────────────────────────────────────────────────

function startWorkoutSession(routineId) {
  const routine = routines[routineId]; if (!routine) return;
  ss.routineId = routineId; ss.active = true; ss.stepIndex = 0;
  ss.paused = false; ss.preparing = true;

  document.getElementById('sessionRoutineName').textContent = routine.name;
  document.getElementById('workoutCompleteScreen').classList.remove('active');
  document.getElementById('sessionPauseIcon').className = 'ti ti-player-pause';
  document.getElementById('sessionPauseText').textContent = 'Pause';

  loadWorkoutStep();
  playBeep(600, 0.05);
  document.getElementById('workoutSessionPage').classList.add('active');

  clearInterval(ss.interval);
  ss.interval = setInterval(tick, 1000);
}

function loadWorkoutStep() {
  const routine = routines[ss.routineId];

  if (ss.preparing) {
    ss.timeLeft = 5; ss.stepDuration = 5;
    document.getElementById('sessionStepIndicator').textContent = 'GET READY';
    document.getElementById('sessionExerciseName').textContent = 'Get Ready!';
    document.getElementById('sessionExerciseInstruct').textContent = 'Stand up, stretch, and get into position...';
    setRingState('prepare', 'READY', 'var(--amber)');
    const first = routine.steps[0];
    document.getElementById('nextGuideName').textContent = `${first.name} (${first.duration}s)`;
    document.getElementById('nextGuideContainer').style.display = 'flex';
  } else {
    const step = routine.steps[ss.stepIndex];
    ss.timeLeft = step.duration; ss.stepDuration = step.duration;
    document.getElementById('sessionStepIndicator').textContent = `Exercise ${ss.stepIndex+1} of ${routine.steps.length}`;
    document.getElementById('sessionExerciseName').textContent = step.name;
    document.getElementById('sessionExerciseInstruct').textContent = step.instruct;
    if (step.type === 'work') setRingState('', 'WORK', 'var(--accent)');
    else setRingState('rest', 'REST', 'var(--blue)');
    const guide = document.getElementById('nextGuideContainer');
    if (ss.stepIndex + 1 < routine.steps.length) {
      const next = routine.steps[ss.stepIndex+1];
      document.getElementById('nextGuideName').textContent = `${next.name} (${next.duration}s)`;
      guide.style.display = 'flex';
    } else { guide.style.display = 'none'; }
  }

  renderTimer();
}

function setRingState(cls, label, color) {
  const ring = document.getElementById('timerRing');
  ring.className.baseVal = cls ? `timer-fill ${cls}` : 'timer-fill';
  const lbl = document.getElementById('timerStateLabel');
  lbl.textContent = label; lbl.style.color = color;
}

function renderTimer() {
  const label = document.getElementById('timerStateLabel').textContent;
  const color = label==='REST' ? 'var(--blue)' : label==='READY' ? 'var(--amber)' : 'var(--accent)';

  document.getElementById('timerText').innerHTML =
    `${ss.timeLeft}<span class="timer-unit" id="timerStateLabel" style="color:${color}">${label}</span>`;

  const ring = document.getElementById('timerRing');
  const pct = ss.timeLeft / ss.stepDuration;
  ring.style.strokeDashoffset = 502.6 * (1 - pct);

  if (ss.timeLeft <= 3 && (label==='WORK' || label==='READY')) ring.classList.add('final-sec');
  else ring.classList.remove('final-sec');
}

function tick() {
  if (ss.paused || !ss.active) return;

  ss.timeLeft--;

  if (ss.timeLeft > 0) {
    renderTimer();
    if (ss.timeLeft <= 3) playBeep(440, 0.1);
  } else {
    renderTimer();
    playBeep(880, 0.35);

    const routine = routines[ss.routineId];
    if (ss.preparing) {
      ss.preparing = false;
      loadWorkoutStep();
    } else if (ss.stepIndex + 1 < routine.steps.length) {
      ss.stepIndex++;
      loadWorkoutStep();
    } else {
      completeWorkoutRoutine();
    }
  }
}

function togglePauseWorkout() {
  ss.paused = !ss.paused;
  document.getElementById('sessionPauseIcon').className = ss.paused ? 'ti ti-player-play' : 'ti ti-player-pause';
  document.getElementById('sessionPauseText').textContent = ss.paused ? 'Resume' : 'Pause';
  playBeep(ss.paused ? 300 : 500, 0.15);
}

function skipWorkoutStep() {
  const routine = routines[ss.routineId]; playBeep(600, 0.1);
  if (ss.preparing) { ss.preparing = false; loadWorkoutStep(); }
  else if (ss.stepIndex + 1 < routine.steps.length) { ss.stepIndex++; loadWorkoutStep(); }
  else completeWorkoutRoutine();
}

function completeWorkoutRoutine() {
  clearInterval(ss.interval);
  const routine = routines[ss.routineId];
  document.getElementById('completeBurned').textContent = `${routine.burn} kcal`;
  document.getElementById('completeDuration').textContent = `${routine.duration} mins`;
  document.getElementById('completeSubtext').textContent = `You completed: ${routine.name}`;
  burnedCalories += routine.burn; activeMinutes += routine.duration;
  workoutsLog.push({name:routine.name, duration:routine.duration, burn:routine.burn});
  saveUserData(); updateUI();
  setTimeout(()=>playBeep(523.25,0.15),0);
  setTimeout(()=>playBeep(659.25,0.15),150);
  setTimeout(()=>playBeep(783.99,0.15),300);
  setTimeout(()=>playBeep(1046.50,0.4),450);
  document.getElementById('workoutCompleteScreen').classList.add('active');
}

function exitWorkoutSession() {
  clearInterval(ss.interval); ss.active = false;
  document.getElementById('workoutSessionPage').classList.remove('active');
  playBeep(400, 0.1);
}

// ─── UI RENDER ────────────────────────────────────────────────────────────────
function updateUI() {
  const net = Math.max(totalCalories - burnedCalories, 0);
  const pct = Math.min((net / dailyGoal) * 100, 100);
  const rem = Math.max(dailyGoal - totalCalories + burnedCalories, 0);
  document.getElementById('totalCalories').innerHTML = totalCalories+' <span class="stat-unit">kcal</span>';
  document.getElementById('totalBurned').innerHTML   = burnedCalories+' <span class="stat-unit">kcal</span>';
  document.getElementById('remaining').innerHTML     = rem+' <span class="stat-unit">kcal</span>';
  document.getElementById('activeTime').innerHTML    = activeMinutes+' <span class="stat-unit">mins</span>';
  document.getElementById('goalProgress').textContent = pct.toFixed(0)+'%';
  document.getElementById('progressFill').style.width = pct+'%';

  let bc,bg,br,tc,ic,msg;
  if (totalCalories===0&&burnedCalories===0) { bc='#1d9e75';bg='rgba(29,158,117,0.12)';br='rgba(29,158,117,0.25)';tc='#9fe1cb';ic='ti-leaf';msg='Log food or start a workout routine!'; }
  else if (net<=800)  { bc='#1d9e75';bg='rgba(29,158,117,0.12)';br='rgba(29,158,117,0.25)';tc='#9fe1cb';ic='ti-leaf';msg='Healthy start! Net calories are balanced.'; }
  else if (net<=1600) { bc='#378add';bg='rgba(55,138,221,0.12)';br='rgba(55,138,221,0.25)';tc='#85b7eb';ic='ti-trending-up';msg='Outstanding balance. Keep pushing!'; }
  else if (net<2000)  { bc='#ef9f27';bg='rgba(239,159,39,0.12)';br='rgba(239,159,39,0.25)';tc='#fac775';ic='ti-alert-triangle';msg='Almost at your limit — try working out!'; }
  else                { bc='#e24b4a';bg='rgba(226,75,74,0.12)';br='rgba(226,75,74,0.25)';tc='#f09595';ic='ti-circle-check';msg='Daily goal reached! Keep active.'; }
  if (burnedCalories>=400) { bg='rgba(29,158,117,0.12)';br='rgba(29,158,117,0.25)';tc='#9fe1cb';ic='ti-bolt';msg='Incredible activity level today!'; }

  document.getElementById('progressFill').style.background = bc;
  const fb=document.getElementById('feedbackBox'); fb.style.background=bg; fb.style.borderColor=br;
  const fi=document.getElementById('feedbackIcon'); fi.className='ti '+ic; fi.style.color=tc;
  document.getElementById('feedbackText').style.color=tc; document.getElementById('feedbackText').textContent=msg;

  const ll=document.getElementById('logList'); ll.innerHTML='';
  if(log.length===0) { ll.innerHTML='<div class="empty-log">No entries yet</div>'; }
  else { log.slice().reverse().forEach((cal,i)=>{ const idx=log.length-i-1; const el=document.createElement('div'); el.className='log-item'; el.innerHTML=`<span class="log-num"><button class="log-delete-btn" onclick="deleteCalorieEntry(${idx})"><i class="ti ti-trash"></i></button>Entry ${idx+1}</span><span class="log-cal">${cal} kcal</span>`; ll.appendChild(el); }); }

  const wl=document.getElementById('workoutsLogList'); wl.innerHTML='';
  if(workoutsLog.length===0) { wl.innerHTML='<div class="empty-log">No exercises logged today</div>'; }
  else { workoutsLog.slice().reverse().forEach((item,i)=>{ const idx=workoutsLog.length-i-1; const el=document.createElement('div'); el.className='log-item'; el.innerHTML=`<span class="log-num"><button class="log-delete-btn" onclick="deleteWorkoutEntry(${idx})"><i class="ti ti-trash"></i></button>${item.name} <span style="font-size:10px;color:var(--text-dim);">(${item.duration}m)</span></span><span class="log-ex-val">-${item.burn} kcal</span>`; wl.appendChild(el); }); }
}

function resetAll() { resetAllLocal(); saveUserData(); updateUI(); playBeep(350,0.2); }

// ─── DIET PLAN ────────────────────────────────────────────────────────────────

let currentDietGoal = 'lose';
let waterGlassesFilled = 0;
let currentFactIndex = 0;

const dietPlans = {
  lose: {
    label: 'Fat Loss',
    kcal: 1500,
    desc: 'A 300–500 kcal/day deficit leads to ~0.5 kg fat loss per week without muscle loss. Prioritize protein at 1.6–2.2 g/kg body weight.',
    macros: { protein:{g:150,pct:40,color:'#1d9e75'}, carbs:{g:125,pct:33,color:'#378add'}, fats:{g:50,pct:27,color:'#ef9f27'} },
    meals: [
      {time:'7:00 AM',name:'Breakfast',icon:'🥣',items:'Oatmeal + 2 boiled eggs + black coffee',kcal:320,tag:'High Protein'},
      {time:'10:00 AM',name:'Morning Snack',icon:'🍎',items:'1 apple + 10 almonds',kcal:150,tag:'Low Calorie'},
      {time:'1:00 PM',name:'Lunch',icon:'🥗',items:'Grilled chicken salad + whole grain bread',kcal:480,tag:'Balanced'},
      {time:'4:00 PM',name:'Afternoon Snack',icon:'🥛',items:'Greek yogurt (plain) + berries',kcal:130,tag:'Probiotic'},
      {time:'7:00 PM',name:'Dinner',icon:'🍗',items:'Baked salmon + steamed broccoli + quinoa',kcal:420,tag:'Omega-3'},
    ],
    eat: ['Lean chicken & turkey','Salmon & tuna','Leafy greens','Eggs & egg whites','Legumes & lentils','Sweet potato','Greek yogurt','Berries'],
    avoid: ['Sugary drinks & soda','White bread & pasta','Fried foods','Alcohol','Processed snacks','Ice cream','Candy & sweets']
  },
  maintain: {
    label: 'Maintenance',
    kcal: 2000,
    desc: 'Eat at your Total Daily Energy Expenditure (TDEE). Balance all macronutrients. Focus on food quality over restriction.',
    macros: { protein:{g:150,pct:30,color:'#1d9e75'}, carbs:{g:225,pct:45,color:'#378add'}, fats:{g:67,pct:25,color:'#ef9f27'} },
    meals: [
      {time:'7:30 AM',name:'Breakfast',icon:'🍳',items:'Scrambled eggs + whole toast + orange juice',kcal:420,tag:'Energizing'},
      {time:'10:30 AM',name:'Morning Snack',icon:'🍌',items:'Banana + peanut butter (1 tbsp)',kcal:200,tag:'Quick Fuel'},
      {time:'1:00 PM',name:'Lunch',icon:'🍱',items:'Rice + grilled fish + mixed vegetables',kcal:600,tag:'Balanced'},
      {time:'4:30 PM',name:'Afternoon Snack',icon:'🧀',items:'Cottage cheese + cucumber slices',kcal:180,tag:'Light'},
      {time:'7:30 PM',name:'Dinner',icon:'🥩',items:'Lean beef stir-fry + brown rice + spinach',kcal:600,tag:'Iron-rich'},
    ],
    eat: ['Whole grains','Mixed vegetables','Fruits','Lean meats','Dairy products','Nuts & seeds','Olive oil','Legumes'],
    avoid: ['Trans fats','Excess sugar','Highly processed foods','Excessive alcohol','Deep-fried foods','Artificial sweeteners']
  },
  gain: {
    label: 'Muscle Gain',
    kcal: 2500,
    desc: 'A 250–500 kcal surplus with 1.6–2.2 g protein per kg bodyweight supports muscle protein synthesis. Resistance training is essential.',
    macros: { protein:{g:180,pct:29,color:'#1d9e75'}, carbs:{g:310,pct:50,color:'#378add'}, fats:{g:83,pct:21,color:'#ef9f27'} },
    meals: [
      {time:'7:00 AM',name:'Breakfast',icon:'🥞',items:'Protein pancakes + eggs + milk + banana',kcal:650,tag:'Calorie Dense'},
      {time:'10:00 AM',name:'Pre-Workout',icon:'🥤',items:'Protein shake + oats + peanut butter',kcal:400,tag:'Pre-fuel'},
      {time:'1:00 PM',name:'Lunch',icon:'🍖',items:'Chicken breast + rice + avocado + beans',kcal:720,tag:'Anabolic'},
      {time:'4:00 PM',name:'Post-Workout',icon:'🧃',items:'Whey protein + banana + chocolate milk',kcal:380,tag:'Recovery'},
      {time:'7:30 PM',name:'Dinner',icon:'🥚',items:'Beef mince pasta + cheese + whole grain bread',kcal:750,tag:'Calorie Dense'},
    ],
    eat: ['Chicken breast','Whole eggs','Brown rice & oats','Whole milk','Red meat','Whey protein','Avocados','Nut butters'],
    avoid: ['Empty calorie junk','Excessive cardio foods','Diet/low-fat products','Skipping meals','Alcohol post-workout','Low-protein meals']
  }
};

const nutritionFacts = [
  {emoji:'🧠',text:'Your brain uses about 20% of your daily calorie intake — even while you sleep.',ref:'Raichle & Gusnard, 2002 — PNAS',url:'https://www.pnas.org/doi/10.1073/pnas.172399499'},
  {emoji:'🥩',text:'Protein has the highest thermic effect of food (TEF) — your body burns up to 30% of its calories just digesting it.',ref:'Westerterp, 2004 — Nutrition & Metabolism',url:'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC524030/'},
  {emoji:'😴',text:'Poor sleep increases hunger hormone ghrelin by 28% and decreases satiety hormone leptin by 18%.',ref:'Spiegel et al., 2004 — PLoS Medicine',url:'https://journals.plos.org/plosmedicine/article?id=10.1371/journal.pmed.0010062'},
  {emoji:'🥦',text:'Broccoli contains more protein per calorie than most cuts of steak — 3g protein per 30 kcal.',ref:'USDA FoodData Central, 2023',url:'https://fdc.nal.usda.gov/'},
  {emoji:'💧',text:'Drinking 500ml of water 30 minutes before meals can reduce calorie intake by up to 13% in adults.',ref:'Dennis et al., 2010 — Obesity Journal (NIH)',url:'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4901052/'},
  {emoji:'🍳',text:'Eating a high-protein breakfast reduces cravings and total daily calorie intake more than any other meal.',ref:'Leidy et al., 2013 — American Journal of Clinical Nutrition',url:'https://academic.oup.com/ajcn/article/97/4/677/4577165'},
  {emoji:'🌿',text:'Fiber slows glucose absorption, reducing blood sugar spikes. Adults need 25–38g of fiber per day.',ref:'Slavin, 2013 — Nutrients (MDPI)',url:'https://www.mdpi.com/2072-6643/5/4/1417'},
  {emoji:'🫀',text:'The Mediterranean diet reduces the risk of cardiovascular disease by 30% compared to a low-fat diet.',ref:'Estruch et al., 2013 — New England Journal of Medicine',url:'https://www.nejm.org/doi/full/10.1056/NEJMoa1200303'},
  {emoji:'⏰',text:'Intermittent fasting (16:8 method) can reduce caloric intake by 10–30% naturally without tracking.',ref:'Harris et al., 2018 — British Journal of Nutrition',url:'https://www.cambridge.org/core/journals/british-journal-of-nutrition'},
  {emoji:'🍫',text:'Dark chocolate (70%+ cacao) contains flavonoids that improve insulin sensitivity and reduce inflammation.',ref:'Grassi et al., 2008 — Journal of Nutrition',url:'https://academic.oup.com/jn/article/138/9/1671/4750819'},
];

function selectDietGoal(goal, btn) {
  currentDietGoal = goal;
  document.querySelectorAll('.goal-pill').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  renderDietPlan();
}

function renderDietPlan() {
  const plan = dietPlans[currentDietGoal];
  // Goal desc
  document.getElementById('dietGoalDescText').textContent = plan.desc;
  // Macro label
  document.getElementById('dietMacroLabel').textContent = plan.label;
  document.getElementById('dietMealSubLabel').textContent = `~${plan.kcal} kcal target`;
  // Macro bars
  ['protein','carbs','fats'].forEach(m => {
    const data = plan.macros[m];
    document.getElementById('macro'+m.charAt(0).toUpperCase()+m.slice(1)).textContent = data.g+'g';
    document.getElementById('macro'+m.charAt(0).toUpperCase()+m.slice(1)+'Bar').style.width = data.pct+'%';
    document.getElementById('macro'+m.charAt(0).toUpperCase()+m.slice(1)+'Bar').style.background = data.color;
    document.getElementById('macro'+m.charAt(0).toUpperCase()+m.slice(1)+'Pct').textContent = data.pct+'%';
  });
  // Meals
  const tl = document.getElementById('mealTimeline');
  tl.innerHTML = '';
  plan.meals.forEach((meal,i) => {
    const el = document.createElement('div');
    el.className = 'meal-item';
    el.style.animationDelay = (i*0.07)+'s';
    el.innerHTML = `
      <div class="meal-time-col">
        <span class="meal-time">${meal.time}</span>
        <div class="meal-dot"></div>
        ${i < plan.meals.length-1 ? '<div class="meal-line"></div>' : ''}
      </div>
      <div class="meal-body">
        <div class="meal-title-row">
          <span class="meal-emoji">${meal.icon}</span>
          <span class="meal-name">${meal.name}</span>
          <span class="meal-tag">${meal.tag}</span>
        </div>
        <p class="meal-items">${meal.items}</p>
        <span class="meal-kcal">${meal.kcal} kcal</span>
      </div>`;
    tl.appendChild(el);
  });
  // Eat / Avoid
  const el = document.getElementById('dietEatList'); el.innerHTML='';
  plan.eat.forEach(item => { const li=document.createElement('li'); li.className='diet-food-item eat-item'; li.textContent=item; el.appendChild(li); });
  const av = document.getElementById('dietAvoidList'); av.innerHTML='';
  plan.avoid.forEach(item => { const li=document.createElement('li'); li.className='diet-food-item avoid-item'; li.textContent=item; av.appendChild(li); });
}

function shuffleFact() {
  currentFactIndex = (currentFactIndex + 1) % nutritionFacts.length;
  const fact = nutritionFacts[currentFactIndex];
  const card = document.getElementById('dietFactCard');
  card.style.opacity = '0'; card.style.transform = 'translateY(8px)';
  setTimeout(() => {
    document.getElementById('dietFactEmoji').textContent = fact.emoji;
    document.getElementById('dietFactText').textContent = fact.text;
    document.getElementById('dietFactRef').innerHTML = `<i class="ti ti-book"></i> Ref: <a href="${fact.url}" target="_blank">${fact.ref}</a>`;
    card.style.opacity = '1'; card.style.transform = 'translateY(0)';
  }, 220);
}

function renderWaterGlasses() {
  const c = document.getElementById('waterGlasses'); c.innerHTML = '';
  for (let i=0;i<8;i++) {
    const g = document.createElement('button');
    g.className = 'water-glass' + (i < waterGlassesFilled ? ' filled' : '');
    g.innerHTML = i < waterGlassesFilled ? '💧' : '🫙';
    g.title = i < waterGlassesFilled ? 'Click to undo' : 'Click to log glass';
    g.onclick = () => {
      if (i < waterGlassesFilled) waterGlassesFilled = i;
      else waterGlassesFilled = i+1;
      document.getElementById('waterCount').textContent = `${waterGlassesFilled} / 8 glasses`;
      renderWaterGlasses();
    };
    c.appendChild(g);
  }
}

// Init diet tab on load
(function initDiet() {
  renderDietPlan();
  const fact = nutritionFacts[0];
  document.getElementById('dietFactEmoji').textContent = fact.emoji;
  document.getElementById('dietFactText').textContent = fact.text;
  document.getElementById('dietFactRef').innerHTML = `<i class="ti ti-book"></i> Ref: <a href="${fact.url}" target="_blank">${fact.ref}</a>`;
  renderWaterGlasses();
})();
// ─── EXTENDED TAB SWITCHING ──────────────────────────────────────────────────
const origSwitchTrackerTab = switchTrackerTab;
switchTrackerTab = function(tab) {
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c=>c.classList.remove('active'));
  const tabMap = {
    nutrition: {btn:'nutritionTabBtn', content:'nutritionTabContent'},
    workout:   {btn:'workoutTabBtn',   content:'workoutTabContent'},
    diet:      {btn:'dietTabBtn',      content:'dietTabContent'},
    exercise:  {btn:'exerciseTabBtn',  content:'exerciseTabContent'},
    equip:     {btn:'equipTabBtn',     content:'equipTabContent'},
    nutriAI:   {btn:'nutriAITabBtn',   content:'nutriAITabContent'},
    ancestral: {btn:'ancestralTabBtn', content:'ancestralTabContent'},
  };
  const t = tabMap[tab];
  if (t) {
    document.getElementById(t.btn).classList.add('active');
    document.getElementById(t.content).classList.add('active');
  }
};

// ─── EXERCISE LIBRARY DATA ────────────────────────────────────────────────────
const exerciseData = [
  {id:'pushup',emoji:'🤸',name:'Push-Up',category:'strength',muscles:['Chest','Triceps','Shoulders','Core'],benefits:'Builds upper body pushing strength, improves posture, and requires zero equipment. Studies show regular push-ups reduce cardiovascular risk and improve functional fitness.',steps:['Start in a high plank, hands slightly wider than shoulder-width.','Keep your body in a straight line from head to heels — engage your core.','Lower your chest toward the floor, elbows at ~45° from torso.','Push explosively back to the start position.','Repeat for desired reps. Modify on knees if needed.'],tip:'Squeeze your glutes throughout the movement to keep your hips from sagging. This turns every push-up into a full-body exercise.'},
  {id:'squat',emoji:'🦵',name:'Bodyweight Squat',category:'strength',muscles:['Quads','Glutes','Hamstrings','Calves'],benefits:'The squat is called the "king of exercises." It builds functional leg and glute strength, improves knee stability, and boosts testosterone production.',steps:['Stand feet shoulder-width apart, toes slightly turned out.','Brace your core as if bracing for a punch.','Push hips back and bend knees, lowering until thighs are parallel.','Drive through your heels to stand back up.','Keep chest tall throughout — do not let your back round.'],tip:'Push your knees out in the direction of your toes throughout the movement. This protects your knee joints and activates glutes more.'},
  {id:'plank',emoji:'🎯',name:'Plank',category:'core',muscles:['Core','Shoulders','Glutes','Back'],benefits:'A single plank works 20+ muscles simultaneously. It builds anti-rotational core strength critical for posture, back health, and athletic performance.',steps:['Lie face-down then rise onto your forearms and toes.','Elbows directly under shoulders, forearms parallel.','Create a straight line from head to heels — no sagging hips.','Squeeze glutes, quads, and core simultaneously.','Breathe steadily and hold for target time.'],tip:'Think about "pulling the floor toward you" with your elbows and "pulling your heels toward your elbows." This activates your core at 100%.'},
  {id:'burpee',emoji:'💥',name:'Burpee',category:'cardio',muscles:['Full Body','Chest','Legs','Core'],benefits:'Burns up to 10–15 calories per minute — more than running. Boosts cardiovascular fitness and builds total-body strength simultaneously.',steps:['Stand upright, feet hip-width apart.','Drop hands to the floor, jump both feet back to plank position.','Perform a push-up (optional for beginners).','Jump feet forward to hands, landing in a squat.','Explode upward, jumping with arms overhead.'],tip:'Focus on rhythm over speed. A controlled burpee with full range of motion burns more calories than a sloppy fast one.'},
  {id:'lunge',emoji:'🚶',name:'Lunge',category:'strength',muscles:['Quads','Glutes','Hamstrings','Hip Flexors'],benefits:'Lunges train each leg independently, correcting muscle imbalances. Essential for runners, athletes, and anyone wanting sculpted legs.',steps:['Stand upright, hands on hips or at sides.','Step one foot forward ~2–3 feet.','Lower your back knee toward the floor (stop 1 inch above).','Front knee should stay behind your toes.','Push through the front heel to return to standing.'],tip:'Imagine you are walking on a straight tightrope. Keeping your hips level and your knee tracking forward is the secret to perfect lunges.'},
  {id:'mountainclimber',emoji:'🧗',name:'Mountain Climber',category:'cardio',muscles:['Core','Shoulders','Hip Flexors','Quads'],benefits:'Combines cardio and core training in one movement. Elevates heart rate rapidly while building core stability and coordination.',steps:['Start in a high plank position, arms straight.','Drive your right knee toward your chest.','Quickly switch — drive left knee in as right foot goes back.','Continue alternating rapidly like running in place.','Keep hips level — do not bounce them up.'],tip:'The slower you go, the more core you use. The faster you go, the more cardio you get. Mix tempos for best results.'},
  {id:'hipbridge',emoji:'🍑',name:'Glute Bridge',category:'strength',muscles:['Glutes','Hamstrings','Lower Back','Core'],benefits:'Activates the glutes more effectively than squats per EMG studies. Counteracts the damage of prolonged sitting by reactivating dormant glute muscles.',steps:['Lie on your back, knees bent, feet flat on floor hip-width apart.','Arms flat at your sides for stability.','Squeeze your glutes and drive your hips up toward the ceiling.','Form a straight line from knees to shoulders at the top.','Hold 1 second, squeeze hard, then lower slowly.'],tip:'Place a resistance band just above your knees and push against it. This cues your glutes to fire harder and prevents knee collapse.'},
  {id:'jumpingjack',emoji:'⚡',name:'Jumping Jack',category:'cardio',muscles:['Calves','Shoulders','Hip Abductors','Core'],benefits:'Burns ~8 calories/minute, improves coordination and agility. Used by military worldwide for warm-ups and conditioning.',steps:['Stand upright, feet together, arms at sides.','Jump feet out while raising arms overhead simultaneously.','Pause briefly at full extension.','Jump back to starting position in one fluid motion.','Maintain a light landing on the balls of your feet.'],tip:'Point your toes slightly outward as you land. This protects your knees and mimics natural running biomechanics.'},
  {id:'tricepsdip',emoji:'💪',name:'Triceps Dip',category:'strength',muscles:['Triceps','Chest','Shoulders'],benefits:'Isolates the often-neglected triceps which make up 2/3 of your upper arm. Can be done on any sturdy chair or bench.',steps:['Sit on the edge of a chair, hands gripping the front edge.','Slide your hips off the seat, supported only by your arms.','Lower your body by bending elbows to ~90 degrees.','Push through palms to return to start.','Keep elbows pointing backward, not flaring out.'],tip:'The closer your feet to the chair, the easier the exercise. The further away (legs straight), the harder it becomes.'},
  {id:'highknees',emoji:'🏃',name:'High Knees',category:'cardio',muscles:['Quads','Hip Flexors','Core','Calves'],benefits:'Mimics the mechanics of sprinting. Improves running speed, agility, and cardiovascular endurance in a minimal space.',steps:['Stand upright, feet hip-width apart.','Drive your right knee up to hip height while pumping left arm forward.','Quickly alternate — left knee up, right arm pumps.','Maintain a fast, rhythmic pace.','Stay on your toes throughout — do not flat-foot land.'],tip:'Look straight ahead and pump your arms actively. Your arm drive directly controls how high your knees go.'},
  {id:'bicycle',emoji:'🚴',name:'Bicycle Crunch',category:'core',muscles:['Obliques','Rectus Abdominis','Hip Flexors'],benefits:'Ranked #1 for oblique activation in ACE research. Simultaneously works all ab muscles through rotation and flexion.',steps:['Lie on your back, hands behind your head lightly.','Lift shoulder blades off the floor. Legs lifted, knees bent.','Bring right elbow toward left knee while extending right leg.','Rotate and bring left elbow to right knee.','Continue in a smooth pedaling rhythm.'],tip:'Think "elbow to opposite hip" rather than "elbow to knee." This ensures you rotate your trunk rather than just reaching with your neck.'},
  {id:'calfrise',emoji:'🦶',name:'Calf Raise',category:'strength',muscles:['Gastrocnemius','Soleus'],benefits:'Calves are involved in nearly every lower body movement. Strong calves reduce ankle injuries, improve running economy, and give legs a sculpted look.',steps:['Stand with feet hip-width apart near a wall or step.','Rise up onto the balls of your feet as high as possible.','Pause at the top and squeeze your calves.','Lower slowly over 2–3 seconds for maximum muscle tension.','Repeat for 15–25 reps.'],tip:'Do these on a step edge with your heels hanging off. The extra range of motion at the bottom dramatically increases muscle growth stimulus.'},
];

let exCurrentFilter = 'all';

function filterExercises(cat, btn) {
  exCurrentFilter = cat;
  document.querySelectorAll('.ex-filter-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  renderExerciseGrid();
}

function renderExerciseGrid() {
  const grid = document.getElementById('exerciseGrid');
  const filtered = exCurrentFilter === 'all' ? exerciseData : exerciseData.filter(e=>e.category===exCurrentFilter);
  document.getElementById('exFilterCount').textContent = filtered.length + ' exercises';
  grid.innerHTML = '';
  filtered.forEach((ex,i) => {
    const card = document.createElement('div');
    card.className = 'ex-card';
    card.style.animationDelay = (i*0.05)+'s';
    card.innerHTML = `
      <span class="ex-card-emoji">${ex.emoji}</span>
      <div class="ex-card-name">${ex.name}</div>
      <div class="ex-card-meta">${ex.muscles.slice(0,2).join(' · ')}</div>
      <span class="ex-cat-tag ex-cat-${ex.category}">${ex.category.charAt(0).toUpperCase()+ex.category.slice(1)}</span>`;
    card.onclick = () => openExModal(ex);
    grid.appendChild(card);
  });
}

function openExModal(ex) {
  document.getElementById('exModalEmoji').textContent = ex.emoji;
  document.getElementById('exModalTitle').textContent = ex.name;
  document.getElementById('exModalTags').innerHTML = `<span class="ex-cat-tag ex-cat-${ex.category}">${ex.category}</span>`;
  document.getElementById('exModalBenefits').textContent = ex.benefits;
  const stepsEl = document.getElementById('exModalSteps');
  stepsEl.innerHTML = '';
  ex.steps.forEach(s => { const li=document.createElement('li'); li.textContent=s; stepsEl.appendChild(li); });
  document.getElementById('exModalMuscles').innerHTML = ex.muscles.map(m=>`<span class="ex-muscle-chip">${m}</span>`).join('');
  document.getElementById('exModalTip').textContent = ex.tip;
  document.getElementById('exModalOverlay').classList.add('open');
  document.body.style.overflow='hidden';
}
function closeExModal(e) { if(e.target===document.getElementById('exModalOverlay')){closeExModalBtn();} }
function closeExModalBtn() { document.getElementById('exModalOverlay').classList.remove('open'); document.body.style.overflow=''; }

// Init
renderExerciseGrid();

// ─── EQUIPMENT GUIDE DATA ─────────────────────────────────────────────────────
const equipmentData = [
  {emoji:'🏋️',name:'Barbell',cat:'Free Weights',desc:'A long steel bar (usually 20kg/45lb for men, 15kg/35lb for women) to which weight plates are added. The foundation of strength training programs worldwide.',steps:['Load equal weight plates on both sides and secure collars.','Position bar in rack at upper chest height for squats, or shoulder height for bench.','Grip firmly outside shoulder-width with thumbs wrapped around.','Unrack under control — never jerk the weight.','Return to rack safely: both sides contact the hooks simultaneously.'],exercises:['Squat','Bench Press','Deadlift','Row','Overhead Press'],safety:'Never lift without a spotter for heavy sets. Always use collars/clips to prevent plates sliding. Check the bar path in a mirror before loading heavy.'},
  {emoji:'🔵',name:'Dumbbell',cat:'Free Weights',desc:'Handheld weights available in fixed increments from 1kg to 100kg+. Arguably the most versatile piece of gym equipment — unilateral training forces each side to work independently.',steps:['Select appropriate weight: start lighter than you think.','Grip with a full hand wrap — thumb under the handle.','Maintain neutral wrist alignment for most exercises.','Control the eccentric (lowering) phase over 2–3 seconds.','Avoid swinging or using momentum — use only muscle force.'],exercises:['Dumbbell Press','Bicep Curl','Lateral Raise','Romanian Deadlift','Row'],safety:'Do not drop dumbbells from height. Store on racks — floor dumbbells are a trip hazard. Never twist your wrist forcefully under load.'},
  {emoji:'⭕',name:'Resistance Band',cat:'Elastic',desc:'Flat or tubular latex bands providing variable elastic resistance. Provide unique "accommodating resistance" — hardest at the strongest point of the exercise.',steps:['Anchor securely under foot, in a door, or on a rack.','Position handles or band ends correctly for the exercise.','Start with lighter resistance bands — form first, strength second.','Maintain consistent tension throughout the full range of motion.','Control the return — do not let the band snap back.'],exercises:['Banded Squat','Pull-Apart','Face Pull','Monster Walk','Banded Push-Up'],safety:'Inspect bands before each use for cracks or tears. Never stretch beyond 3x their resting length. Keep away from sharp edges.'},
  {emoji:'🫙',name:'Kettlebell',cat:'Free Weights',desc:'A cast-iron ball with a handle. Unlike dumbbells, the center of mass is offset from the handle, creating unique swing and ballistic training opportunities.',steps:['Grip the handle with both hands, standing feet hip-width apart.','For swings: hinge at hips, not squatting — drive with explosive hip extension.','Keep the bell close to your body on the backswing.','Maintain a neutral spine throughout — never round the lower back.','Start with 2-handed swings before progressing to single-arm.'],exercises:['Kettlebell Swing','Turkish Get-Up','Goblet Squat','Clean','Snatch'],safety:'The kettlebell swing is a hip hinge, not a squat. Learn the pattern with bodyweight first. Wrist position matters — keep neutral to avoid bruising.'},
  {emoji:'🪢',name:'Jump Rope',cat:'Cardio',desc:'One of the most efficient tools for cardiovascular conditioning. A 10-minute jump rope session is equivalent to jogging 1 mile in terms of calorie burn.',steps:['Hold handles at hip height, arms slightly bent.','Keep elbows close to your sides — wrist drives rotation, not arms.','Jump only 1–2 inches off ground — just enough to clear the rope.','Land softly on the balls of your feet, not flat-footed.','Start with 30-second intervals and build up progressively.'],exercises:['Single Bounce','Double Under','Alternating Foot','High Knee Jump','Speed Jump'],safety:'Use proper rope length — when you stand on the middle, handles should reach armpits. Jump on a rubber mat to protect joints.'},
  {emoji:'💙',name:'Foam Roller',cat:'Recovery',desc:'A cylindrical foam tool used for self-myofascial release (SMR). Rolling helps break up muscle adhesions, improve blood flow, and accelerate recovery.',steps:['Place roller under target muscle group.','Apply moderate pressure using body weight.','Roll slowly 1–2 inches per second along the muscle.','When you find a tight spot (trigger point), pause for 20–30 seconds.','Complete 1–2 minutes per muscle group.'],exercises:['IT Band Roll','Quad Roll','Upper Back Release','Calf Roll','Hip Flexor Release'],safety:'Avoid rolling directly over joints or bones. Never roll the lower back — roll the thoracic spine instead. Should feel like "good pain" — not sharp pain.'},
  {emoji:'🏊',name:'Pull-Up Bar',cat:'Bodyweight',desc:'A horizontal bar fixed to a doorframe, wall, or freestanding rack. Enables vertical pulling movements which are among the most effective back and bicep exercises.',steps:['Grip slightly wider than shoulder-width, palms facing away for pull-ups.','Hang with full arm extension — do not half-hang.','Depress your shoulder blades first before bending elbows.','Pull your chest toward the bar, not your chin over it.','Lower fully under control over 3 seconds.'],exercises:['Pull-Up','Chin-Up','Hanging Knee Raise','L-Sit','Scapular Pull'],safety:'Ensure bar is rated for your weight plus dynamic loading (2–3x body weight). Build grip strength before attempting kipping motions.'},
  {emoji:'🟤',name:'Medicine Ball',cat:'Power',desc:'A heavy, weighted ball used for power and explosiveness training. Throwing, slamming, and rotating with medicine balls develops athletic power unlike any other tool.',steps:['Choose weight: 4–8kg for most beginners.','For slams: raise overhead, slam down with full force, catch on bounce.','For throws: stand sideways, rotate hips and core to generate power.','Always brace your core before explosive movements.','Partner throws: communicate clearly — never throw without eye contact.'],exercises:['Ball Slam','Rotational Throw','Chest Pass','V-Up Toss','Wall Ball'],safety:'Do not use a medicine ball on hard concrete — use rubber mats. Ensure ceiling height is adequate for overhead movements.'},
  {emoji:'⚖️',name:'Cable Machine',cat:'Machine',desc:'Uses a system of pulleys and adjustable weight stacks. Provides constant tension throughout the entire range of motion — a significant advantage over free weights for muscle development.',steps:['Set the pulley to the correct height for your exercise.','Select weight using the pin in the weight stack.','Grasp the attachment firmly and step away to create cable tension before starting.','Maintain stable base: shoulder-width stance, slight knee bend.','Control both the pulling and returning phases equally.'],exercises:['Cable Row','Lat Pulldown','Face Pull','Cable Curl','Triceps Pushdown'],safety:'Never let the weight stack slam down. Stand clear of the weight stack. Do not lean on the machine during exercise.'},
  {emoji:'🧱',name:'Weight Bench',cat:'Furniture',desc:'A flat, incline, or decline padded bench used to stabilize the body for pressing and rowing movements. The cornerstone of upper body training.',steps:['Adjust incline if applicable before adding weight.','For bench press: plant feet flat, slight arch in lower back, shoulder blades retracted and depressed.','Grip should be outside shoulder-width — thumbs wrapped around the bar.','Lower bar to lower chest, not neck.','Press in a slight arc — back toward the rack.'],exercises:['Bench Press','Incline DB Press','Step-Up','Seated Curl','Decline Push-Up'],safety:'Always bench press with a spotter or use a power rack with safety pins set at chest height. Never unrack the bar alone with maximal weights.'},
  {emoji:'🔄',name:'TRX / Suspension Trainer',cat:'Bodyweight',desc:'Suspension straps anchored overhead, using your body weight and gravity. Every exercise challenges your core stability because your base of support is always moving.',steps:['Anchor securely at a sturdy point — door anchor or overhead.','Adjust strap length based on the exercise.','Body angle determines difficulty — more horizontal = harder.','Keep core engaged at all times — no sagging hips.','Start with shorter duration sets: TRX is deceptively challenging.'],exercises:['TRX Row','TRX Push-Up','TRX Squat','TRX Plank','TRX Lunge'],safety:'Test anchor point with full body weight before dynamic movements. Inspect stitching and carabiners regularly for wear.'},
  {emoji:'🏃',name:'Treadmill',cat:'Cardio Machine',desc:'A motorized belt that simulates walking, jogging, or running indoors. Consistent speed and incline control make it ideal for progressive cardio training.',steps:['Straddle the belt and start at a low speed (3–4 km/h).','Set incline to 1–2% to simulate outdoor running mechanics.','Step onto the moving belt confidently with a natural stride.','Avoid holding the handrails — swing arms freely for calorie burn.','Cool down with 3–5 minutes of slow walking before stopping.'],exercises:['Walking','Jogging','Interval Sprint','Incline Walk','Race Pace Run'],safety:'Always attach the safety clip to your clothing. Step off carefully at the end. Do not jump on/off a fast-moving belt.'},
];

function renderEquipGrid() {
  const grid = document.getElementById('equipGrid');
  grid.innerHTML = '';
  equipmentData.forEach((eq,i) => {
    const card = document.createElement('div');
    card.className = 'equip-card';
    card.style.animationDelay = (i*0.04)+'s';
    card.innerHTML = `<div class="equip-card-emoji">${eq.emoji}</div><div class="equip-card-info"><div class="equip-card-name">${eq.name}</div><div class="equip-card-cat">${eq.cat}</div></div>`;
    card.onclick = () => openEquipModal(eq);
    grid.appendChild(card);
  });
}

function openEquipModal(eq) {
  document.getElementById('equipModalEmoji').textContent = eq.emoji;
  document.getElementById('equipModalTitle').textContent = eq.name;
  document.getElementById('equipModalCat').textContent = eq.cat;
  document.getElementById('equipModalCat').className = 'ex-cat-tag ex-cat-strength';
  document.getElementById('equipModalDesc').textContent = eq.desc;
  const stepsEl = document.getElementById('equipModalSteps');
  stepsEl.innerHTML = '';
  eq.steps.forEach(s => { const li=document.createElement('li'); li.textContent=s; stepsEl.appendChild(li); });
  document.getElementById('equipModalExercises').innerHTML = eq.exercises.map(e=>`<span class="equip-ex-chip">${e}</span>`).join('');
  document.getElementById('equipModalSafety').textContent = eq.safety;
  document.getElementById('equipModalOverlay').classList.add('open');
  document.body.style.overflow='hidden';
}
function closeEquipModal(e) { if(e.target===document.getElementById('equipModalOverlay')){closeEquipModalBtn();} }
function closeEquipModalBtn() { document.getElementById('equipModalOverlay').classList.remove('open'); document.body.style.overflow=''; }

renderEquipGrid();

// ─── AI NUTRITIONIST ──────────────────────────────────────────────────────────
function analyzeNutrition() {
  const age = parseFloat(document.getElementById('nutriAge').value);
  const gender = document.getElementById('nutriGender').value;
  const weight = parseFloat(document.getElementById('nutriWeight').value);
  const height = parseFloat(document.getElementById('nutriHeight').value);
  const activity = document.getElementById('nutriActivity').value;
  const goal = document.getElementById('nutriGoal').value;
  const sleep = parseFloat(document.getElementById('nutriSleep').value);
  const water = parseFloat(document.getElementById('nutriWater').value);
  const notes = document.getElementById('nutriNotes').value.toLowerCase();

  if (!age||!gender||!weight||!height||!activity||!goal||!sleep||!water) {
    alert('Please fill in all required fields.'); return;
  }

  // BMI
  const bmi = weight / ((height/100)**2);
  const bmiCat = bmi<18.5?'Underweight':bmi<25?'Normal':bmi<30?'Overweight':'Obese';

  // TDEE (Mifflin-St Jeor)
  let bmr;
  if (gender==='male') bmr = 10*weight + 6.25*height - 5*age + 5;
  else bmr = 10*weight + 6.25*height - 5*age - 161;
  const actMult = {sedentary:1.2,light:1.375,moderate:1.55,active:1.725,athlete:1.9};
  const tdee = Math.round(bmr * (actMult[activity]||1.55));

  // Score breakdown
  const breakdown = [];
  let totalScore = 0;

  // BMI (20 pts)
  let bmiScore = bmi>=18.5&&bmi<25 ? 20 : bmi>=25&&bmi<30 ? 12 : bmi>=17&&bmi<18.5 ? 10 : 5;
  breakdown.push({label:'BMI Score', pts:bmiScore, max:20, color:'var(--accent)'});
  totalScore += bmiScore;

  // Activity (25 pts)
  const actScore = {sedentary:8,light:14,moderate:20,active:24,athlete:25}[activity]||10;
  breakdown.push({label:'Activity Level', pts:actScore, max:25, color:'var(--blue)'});
  totalScore += actScore;

  // Sleep (20 pts)
  let sleepScore = sleep>=7&&sleep<=9 ? 20 : sleep>=6&&sleep<7 ? 14 : sleep>=9&&sleep<=10 ? 16 : sleep<5 ? 4 : 8;
  breakdown.push({label:'Sleep Quality', pts:sleepScore, max:20, color:'#9b59b6'});
  totalScore += sleepScore;

  // Hydration (15 pts)
  let waterScore = water>=8 ? 15 : water>=6 ? 11 : water>=4 ? 7 : 3;
  breakdown.push({label:'Hydration', pts:waterScore, max:15, color:'var(--blue)'});
  totalScore += waterScore;

  // Goal alignment (20 pts) — bonus for having a goal
  let goalScore = goal ? 18 : 0;
  if (goal==='maintain' && bmiCat==='Normal') goalScore = 20;
  breakdown.push({label:'Goal Alignment', pts:goalScore, max:20, color:'var(--amber)'});
  totalScore += goalScore;

  totalScore = Math.min(Math.round(totalScore), 100);

  // Grade
  let grade, gradeColor, gradeBg;
  if (totalScore>=85){grade='Excellent 🏆';gradeColor='var(--accent)';gradeBg='rgba(29,158,117,0.15)';}
  else if(totalScore>=70){grade='Very Good 💪';gradeColor='var(--blue)';gradeBg='rgba(55,138,221,0.15)';}
  else if(totalScore>=55){grade='Good 👍';gradeColor='var(--amber)';gradeBg='rgba(239,159,39,0.15)';}
  else if(totalScore>=40){grade='Fair ⚡';gradeColor='var(--amber)';gradeBg='rgba(239,159,39,0.15)';}
  else{grade='Needs Work 💡';gradeColor='var(--red)';gradeBg='rgba(226,75,74,0.15)';}

  // Render score
  document.getElementById('nutriFormSection').style.display='none';
  document.getElementById('nutriResultsSection').style.display='block';

  const scoreGradeEl = document.getElementById('nutriScoreGrade');
  scoreGradeEl.textContent = grade;
  scoreGradeEl.style.color = gradeColor;
  scoreGradeEl.style.borderColor = gradeColor;
  scoreGradeEl.style.background = gradeBg;

  // Animate score
  let displayed = 0;
  const interval = setInterval(() => {
    displayed = Math.min(displayed+2, totalScore);
    document.getElementById('nutriScoreNum').textContent = displayed;
    const pct = displayed/100;
    document.getElementById('nutriRingFill').style.strokeDashoffset = 326.7*(1-pct);
    const ringColor = displayed>=70?'var(--accent)':displayed>=50?'var(--amber)':'var(--red)';
    document.getElementById('nutriRingFill').style.stroke = ringColor;
    if(displayed>=totalScore) clearInterval(interval);
  }, 20);

  // Breakdown bars
  const bkEl = document.getElementById('nutriBreakdown');
  bkEl.innerHTML = '';
  breakdown.forEach((b,i)=>{
    const row=document.createElement('div');row.className='nutri-bp-row';row.style.animationDelay=(i*0.1)+'s';
    row.innerHTML=`<div class="nutri-bp-label">${b.label}</div><div class="nutri-bp-bar-bg"><div class="nutri-bp-bar" style="width:0%;background:${b.color};" data-pct="${(b.pts/b.max*100).toFixed(0)}"></div></div><div class="nutri-bp-pts" style="color:${b.color}">${b.pts}/${b.max}</div>`;
    bkEl.appendChild(row);
    setTimeout(()=>{row.querySelector('.nutri-bp-bar').style.width=(b.pts/b.max*100)+'%';},(i*80)+200);
  });

  // Recommendations
  const recs = [];
  if(bmi>=25) recs.push({icon:'⚖️',text:`Your BMI is ${bmi.toFixed(1)} (${bmiCat}). A 500 kcal/day caloric deficit through diet and exercise can help achieve ~0.5kg/week fat loss safely.`});
  if(bmi<18.5) recs.push({icon:'🍽️',text:`Your BMI is ${bmi.toFixed(1)} (Underweight). Aim for a 300–500 kcal daily surplus with emphasis on protein (1.8g/kg) to build lean mass.`});
  if(sleep<7) recs.push({icon:'😴',text:`You are averaging ${sleep} hrs of sleep. Research shows less than 7 hours increases hunger hormones by 28% and dramatically reduces muscle recovery. Aim for 7–9 hrs.`});
  if(water<8) recs.push({icon:'💧',text:`You are drinking ${water} glasses/day. Dehydration reduces exercise performance by up to 30%. Aim for 8–10 glasses daily and more on training days.`});
  if(activity==='sedentary') recs.push({icon:'🏃',text:'Sedentary lifestyle is linked to 35% higher cardiovascular risk. Start with 3 x 30 min walks per week — research shows this alone can add 3.4 years to your lifespan.'});
  if(goal==='gain') recs.push({icon:'🥩',text:`Your estimated TDEE is ${tdee} kcal. For muscle gain, eat ${tdee+300}–${tdee+500} kcal/day with at least ${Math.round(weight*1.8)}g protein. Train with progressive overload 3–4x/week.`});
  if(goal==='lose') recs.push({icon:'🔥',text:`Your TDEE is ${tdee} kcal. For fat loss, target ${tdee-500} kcal/day. Keep protein at ${Math.round(weight*1.8)}g+ to preserve muscle while in deficit.`});
  if(notes.includes('diabetes')) recs.push({icon:'🩸',text:'With diabetes, prioritize low-GI foods (oats, legumes, sweet potato). Resistance training improves insulin sensitivity by up to 30%. Monitor blood glucose before/after exercise.'});
  if(notes.includes('vegetarian')||notes.includes('vegan')) recs.push({icon:'🌱',text:'Plant-based athletes: combine rice + lentils for complete amino acids. Supplement with B12, iron, and omega-3 (algae-based). Soy and pea protein have high bioavailability.'});
  if(notes.includes('knee')) recs.push({icon:'🦵',text:'With knee concerns, focus on low-impact cardio: swimming, cycling, or elliptical. Strengthen VMO (inner quad) with terminal knee extensions and wall sits to protect the joint.'});
  if(recs.length===0) recs.push({icon:'⭐',text:`Great health profile! Your TDEE is ~${tdee} kcal. Maintain your current routine. Focus on progressive overload in training and periodically reassess every 3 months.`});

  const recsEl = document.getElementById('nutriRecs');
  recsEl.innerHTML = '';
  recs.forEach((r,i)=>{ const el=document.createElement('div');el.className='nutri-rec-item';el.style.animationDelay=(i*0.1)+'s';el.innerHTML=`<span class="nutri-rec-icon">${r.icon}</span><span>${r.text}</span>`;recsEl.appendChild(el); });

  // Stats
  document.getElementById('nutriStatsRow').innerHTML = `
    <div class="nutri-stat-box"><div class="nutri-stat-val">${bmi.toFixed(1)}</div><div class="nutri-stat-lbl">BMI (${bmiCat})</div></div>
    <div class="nutri-stat-box"><div class="nutri-stat-val">${tdee}</div><div class="nutri-stat-lbl">Daily TDEE (kcal)</div></div>
    <div class="nutri-stat-box"><div class="nutri-stat-val">${Math.round(weight*1.8)}g</div><div class="nutri-stat-lbl">Target Protein</div></div>
    <div class="nutri-stat-box"><div class="nutri-stat-val">${goal==='lose'?tdee-500:goal==='gain'?tdee+400:tdee}</div><div class="nutri-stat-lbl">Calorie Target</div></div>`;
}

function resetNutriForm() {
  document.getElementById('nutriFormSection').style.display='block';
  document.getElementById('nutriResultsSection').style.display='none';
}

// ─── ANCESTRAL ORIGINS DATA ───────────────────────────────────────────────────
const ancestralData = [
  {region:'asia',flag:'🇮🇳',name:'Yoga',origin:'India — Indus Valley Civilization',era:'~3000 BCE',story:'Yoga was not invented — it evolved over 5,000 years in the Indus Valley. Ancient seals show figures in meditation postures. The Rigveda (~1500 BCE) first used the word "Yoga." Practitioners believed that disciplining the body was the only path to liberating the mind. Ancient yogis lived in forests and mountains, practicing for 4–8 hours daily.',motivation:'Our ancestors did not do yoga for fitness — they did it for freedom. They believed a still body creates a still mind, and a still mind sees truth. When you do yoga today, you carry a 5,000-year-old tradition of human liberation.',detail:{traditions:['Hatha Yoga','Ashtanga','Pranayama','Kundalini'],benefits:['Reduces cortisol by 20%','Improves flexibility by 35% in 8 weeks','Reduces chronic back pain','Lowers blood pressure'],fact:'The Yoga Sutras of Patanjali (400 CE) described 8 limbs of yoga — physical postures were only one of the eight.'}},
  {region:'asia',flag:'🇨🇳',name:'Kung Fu (Wushu)',origin:'China — Shaolin Monastery',era:'~527 CE',story:'Emperor Bodhidharma arrived at the Shaolin Monastery in 527 CE and found monks so physically weak they could not stay awake during meditation. He introduced a series of exercises called "Eighteen Hands of the Luohan" — the foundation of Shaolin Kung Fu. These movements mimicked animals: the tiger for strength, crane for balance, snake for flexibility, leopard for speed, and dragon for spirit.',motivation:'Kung Fu was never about fighting — it was about self-mastery. The Shaolin monks trained 6 hours daily because they understood that a strong body enables a strong practice. They had a saying: "Train as if you are preparing for a battle you hope never comes."',detail:{traditions:['Shaolin','Wing Chun','Tai Chi','Ba Gua Zhang'],benefits:['Improves reaction time','Builds explosive power','Enhances mental focus','Develops coordination'],fact:'The word "Kung Fu" literally means "skill achieved through hard work and time" — it does not mean martial arts.'}},
  {region:'europe',flag:'🇬🇷',name:'Olympic Wrestling',origin:'Greece — Ancient Olympia',era:'~708 BCE',story:'At the 18th Olympiad in 708 BCE, wrestling was added as the first Olympic combat sport. Greek wrestlers trained in the "palaestra" — dedicated wrestling schools. Athletes rubbed their bodies with olive oil and covered themselves in fine sand for grip. Wrestling was considered the ultimate test of character — strength, technique, and mental endurance combined. Legends like Milo of Croton were said to have carried a full-grown bull on his back.',motivation:'Greek athletes did not train to look good — they trained because society demanded excellence. The highest honor was not gold or money — it was the olive wreath crown. Our ancestors competed for glory alone. In an era without Instagram, the stadium was your stage, and effort was the only currency.',detail:{traditions:['Greco-Roman','Pankration','Submission','Freestyle'],benefits:['Builds functional strength','Develops mental toughness','Improves spatial awareness','Enhances cardiovascular endurance'],fact:'Ancient Greek wrestlers competed nude. The word "gymnasium" comes from Greek "gymnos" meaning "naked" — that is how seriously they took physical training.'}},
  {region:'europe',flag:'🇸🇪',name:'Viking Strength Training',origin:'Scandinavia — Norse Culture',era:'~700–1100 CE',story:'Norse warriors lifted heavy stones called "Mannjafnaðarsteinar" (equality stones) to prove strength for battle. These lifting stones — some weighing 340kg — still exist in Iceland today. Vikings rowed longships for hours, swam in freezing fjords, and climbed ice-covered rock faces. Their training was functional: every exercise had a direct combat or survival application.',motivation:'The Vikings did not train because they wanted to — they trained because winter was coming, enemies were real, and weakness meant death. They left us a legacy: movement is survival. Your ancestors\' strength is encoded in your biology — honor it.',detail:{traditions:['Stone Lifting','Log Toss','Rope Climbing','Swimming'],benefits:['Maximum strength development','Cold adaptation','Grip strength','Mental resilience'],fact:'The Icelandic "Husafell Stone" (186kg) has been lifted continuously since the 14th century as a farmer strength test. It still challenges the world\'s strongest athletes today.'}},
  {region:'africa',flag:'🇪🇹',name:'Gena (Running Culture)',origin:'Ethiopia & East Africa',era:'~1500 BCE',story:'The Kalenjin tribe of Kenya and the Oromo people of Ethiopia have produced over 80% of the world\'s greatest distance runners — not by genetics alone, but by culture. Children ran to school barefoot from age 5 — sometimes 10–20km daily. Running was woven into every ceremony, ritual, and rite of passage. The Ethiopian word for hard training is "Ye tillik", meaning "doing the important thing."',motivation:'East African runners do not run away from hardship — they run toward it. Their ancestors ran to bring messages across vast distances, to hunt, and to honor the gods. Every time you lace up your shoes, you participate in humanity\'s oldest and most democratic sport.',detail:{traditions:['Fartlek','Altitude Training','Barefoot Running','Long Slow Distance'],benefits:['Improves VO2 max','Reduces all-cause mortality by 30%','Improves bone density','Lifts mood through endorphins'],fact:'The Tarahumara people of Mexico run 100-mile races in sandals for sport and ceremony — proof that the human body was designed to run far.'}},
  {region:'africa',flag:'🇸🇳',name:'Laamb (Traditional Wrestling)',origin:'Senegal, West Africa',era:'~13th Century CE',story:'Laamb is the national sport of Senegal, practiced for over 700 years. Warriors in the Senegambian region used it to settle disputes, demonstrate strength for marriage eligibility, and select military leaders. Wrestlers undergo months of spiritual preparation with griots (spiritual advisors) as important as physical coaches. The pre-fight rituals — with music, dance, and sacred amulets — can last longer than the fight itself.',motivation:'In West Africa, a wrestler was not just an athlete — he was a symbol of the community\'s strength. Your ancestors used physical training as proof of character. Every time you train hard, you honor that tradition: strength in service of something greater than yourself.',detail:{traditions:['Njom (grappling)','Mbapatt (strikes allowed)','Village ceremonies','Coastal sand training'],benefits:['Full body power','Core stability','Explosive hip strength','Mental fortitude'],fact:'Laamb champions in Senegal are treated like national heroes. Prize money can exceed $200,000 USD, making it one of Africa\'s highest-paying sports.'}},
  {region:'americas',flag:'🇲🇽',name:'Ullamaliztli (Ball Game)',origin:'Mesoamerica — Olmec/Maya/Aztec',era:'~1500 BCE',story:'The Mesoamerican ball game is one of the oldest organized sports in human history — over 3,500 years old. Players used only their hips, thighs, and elbows to propel a solid rubber ball through a stone ring. The rings were vertical, mounted 6–8 meters high on the court walls. Players trained their hip strikes and lateral movement for years. The game had deep spiritual significance — balls represented the sun and moon.',motivation:'The ancestors of Mexico and Central America built entire cities around athletic arenas — not temples. They understood that sport was civilization, not entertainment. Physical discipline was how they communicated with their gods and demonstrated their worthiness to lead.',detail:{traditions:['Ulama de cadera (hip game)','Modern handball','Pok-a-Tok (Maya version)','Tlachtli (Aztec)'],benefits:['Hip mobility','Lateral agility','Explosive power','Hand-eye coordination'],fact:'The rubber ball used was made from the sap of the Castilla elastica tree mixed with juice from morning glory vines — an early form of vulcanized rubber, 3,000 years before Charles Goodyear.'}},
  {region:'americas',flag:'🇺🇸',name:'Lacrosse',origin:'Native North America — Haudenosaunee',era:'~1100 CE',story:'Created by the Haudenosaunee (Iroquois) and other Native nations, Lacrosse was called "The Creator\'s Game." It was played as a spiritual practice, a method of conflict resolution between tribes, and training for warriors. Games could last 3 days and involve hundreds of players across miles of terrain. The stick was considered a sacred object. Tribes in the Great Lakes region played year-round regardless of weather.',motivation:'Native American athletes did not just play lacrosse — they offered it. The game was a gift back to the Creator, a form of prayer through physical excellence. When you run, sweat, and push your limits, you participate in the oldest form of human worship: using your body fully.',detail:{traditions:['Field Lacrosse','Box Lacrosse','Women\'s Lacrosse','Modern Olympics'],benefits:['Speed and agility','Hand-eye coordination','Cardiovascular endurance','Team strategy'],fact:'Lacrosse games were sometimes played to help cure sick tribal members — the healing power was believed to come from the effort and spirit of the players, not just the medicine.'}}
];

let ancCurrentFilter = 'all';
let ancCurrentQuote = 0;

const ancestralQuotes = [
  {text:'Those who think they have no time for bodily exercise will sooner or later have to find time for illness.',source:'— Edward Stanley'},
  {text:'In ancient times, the body was not separate from the spirit. Movement was prayer.',source:'— Native American teaching'},
  {text:'The first wealth is health.',source:'— Ralph Waldo Emerson'},
  {text:'Our ancestors ran, wrestled, lifted, and swam not for fitness — but for life itself.',source:'— Ancient wisdom'},
  {text:'Take care of your body. It is the only place you have to live.',source:'— Jim Rohn'},
  {text:'Mens sana in corpore sano — A healthy mind in a healthy body.',source:'— Juvenal, Roman poet, 100 AD'},
  {text:'The body is the instrument of the soul.',source:'— Aristotle, 350 BCE'},
  {text:'He who has health has hope, and he who has hope has everything.',source:'— Arabian proverb'},
  {text:'Those who do not find time for exercise will have to find time for illness.',source:'— John Lubbock, 1870'},
  {text:'The human body has one ability that no machine has ever replicated — it gets better the more you use it.',source:'— Robert Heinlein'},
];

function filterAncestral(region, btn) {
  ancCurrentFilter = region;
  document.querySelectorAll('.anc-filter-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  renderAncestralCards();
}

function renderAncestralCards() {
  const container = document.getElementById('ancestralCards');
  const filtered = ancCurrentFilter==='all' ? ancestralData : ancestralData.filter(a=>a.region===ancCurrentFilter);
  container.innerHTML = '';
  filtered.forEach((anc,i) => {
    const card = document.createElement('div');
    card.className = 'anc-card';
    card.style.animationDelay = (i*0.08)+'s';
    card.innerHTML = `
      <div class="anc-card-top">
        <div class="anc-flag">${anc.flag}</div>
        <div>
          <div class="anc-card-name">${anc.name}</div>
          <div class="anc-card-origin">${anc.origin}</div>
          <div class="anc-card-era">${anc.era}</div>
        </div>
      </div>
      <p class="anc-card-story">${anc.story}</p>
      <div class="anc-card-motivation">${anc.motivation}</div>
      <button class="anc-expand-btn" onclick="toggleAncDetail(this)">
        <i class="ti ti-chevron-down"></i> Learn more traditions & benefits
      </button>
      <div class="anc-card-detail">
        <div class="anc-detail-row">
          ${anc.detail.traditions.map(t=>`<span class="anc-detail-chip">🏛️ ${t}</span>`).join('')}
        </div>
        <div class="anc-detail-row">
          ${anc.detail.benefits.map(b=>`<span class="anc-detail-chip" style="background:rgba(29,158,117,0.1);border-color:rgba(29,158,117,0.2);color:var(--accent);">✓ ${b}</span>`).join('')}
        </div>
        <p class="anc-fun-fact">💡 <strong>Did you know?</strong> ${anc.detail.fact}</p>
      </div>`;
    container.appendChild(card);
  });
}

function toggleAncDetail(btn) {
  const detail = btn.nextElementSibling;
  const isOpen = detail.classList.contains('open');
  detail.classList.toggle('open',!isOpen);
  btn.innerHTML = isOpen
    ? '<i class="ti ti-chevron-down"></i> Learn more traditions & benefits'
    : '<i class="ti ti-chevron-up"></i> Show less';
}

function nextAncestralQuote() {
  ancCurrentQuote = (ancCurrentQuote+1) % ancestralQuotes.length;
  const q = ancestralQuotes[ancCurrentQuote];
  const card = document.getElementById('ancQuoteCard');
  card.style.opacity='0'; card.style.transform='translateY(6px)';
  setTimeout(()=>{
    document.getElementById('ancQuoteText').textContent = '"'+q.text+'"';
    document.getElementById('ancQuoteSource').textContent = q.source;
    card.style.opacity='1'; card.style.transform='translateY(0)';
  },200);
}

// Initialize ancestral on load
renderAncestralCards();
// ─── DEMO LOGIN ───────────────────────────────────────────────────────────────
function doDemo() {
  currentUser = 'Demo User';
  document.getElementById('userNameDisplay').textContent = currentUser;
  resetAllLocal();
  // Seed with some demo data
  totalCalories = 820; burnedCalories = 240; activeMinutes = 30; entries = 3;
  log = [320, 350, 150]; workoutsLog = [{name:'HIIT Cardio Blast', duration:4, burn:240}];
  updateUI();
  showPage('trackerPage');
}

// ─── MOTIVATION QUOTES ────────────────────────────────────────────────────────
const motivationQuotes = [
  {e:'💪', t:'Stay consistent — every rep counts!'},
  {e:'🔥', t:'Push through the pain — greatness is on the other side.'},
  {e:'🎯', t:'Small progress daily leads to big results.'},
  {e:'🏆', t:'Champions are made when no one is watching.'},
  {e:'⚡', t:'Your only competition is who you were yesterday.'},
  {e:'🌱', t:'Discipline is choosing what you want most over what you want now.'},
  {e:'🚀', t:'The body achieves what the mind believes.'},
  {e:'💡', t:'One healthy choice leads to another.'},
  {e:'🎖️', t:'You are one workout away from a better mood.'},
  {e:'🌟', t:'Eat well, move daily, sleep enough — repeat.'},
];
let motivIdx = 0;
function refreshMotivation() {
  motivIdx = (motivIdx + 1) % motivationQuotes.length;
  const q = motivationQuotes[motivIdx];
  document.getElementById('motivEmoji').textContent = q.e;
  document.getElementById('motivText').textContent = q.t;
}
// Shuffle on load
motivIdx = Math.floor(Math.random() * motivationQuotes.length);
(function initMotiv(){
  const q = motivationQuotes[motivIdx];
  const em = document.getElementById('motivEmoji');
  const tx = document.getElementById('motivText');
  if(em) em.textContent = q.e;
  if(tx) tx.textContent = q.t;
})();

// ─── QUICK ADD PRESET ─────────────────────────────────────────────────────────
function quickAdd(cal) {
  totalCalories += cal; entries++; log.push(cal); saveUserData(); updateUI();
  // Flash feedback
  const btn = event.target.closest('.preset-btn');
  if (btn) { btn.style.borderColor = 'var(--accent)'; setTimeout(()=>btn.style.borderColor='', 600); }
}

// ─── PATCH updateUI to also update workout hero stats and log count badge ──────
const _originalUpdateUI = updateUI;
updateUI = function() {
  _originalUpdateUI();
  // Update workout hero stats
  const whb = document.getElementById('wh-burned');
  const wht = document.getElementById('wh-time');
  if (whb) whb.textContent = burnedCalories;
  if (wht) wht.textContent = activeMinutes;
  // Update log count badge
  const lcb = document.getElementById('logCountBadge');
  if (lcb) lcb.textContent = log.length + ' ' + (log.length === 1 ? 'entry' : 'entries');
  // Update mini bar
  const mb = document.getElementById('consumedBarMini');
  if (mb) mb.style.width = Math.min((totalCalories/dailyGoal)*100, 100) + '%';
};