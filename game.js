/* Ben 10: Pet Guardians - Game Logic */

/* ---------- SETUP ---------- */
const cvs = document.getElementById('game'), ctx = cvs.getContext('2d');
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// Set CSS variables for safe areas
document.documentElement.style.setProperty('--sat', getComputedStyle(document.documentElement).paddingTop);
document.documentElement.style.setProperty('--sab', getComputedStyle(document.documentElement).paddingBottom);

// Responsive canvas
function resizeCanvas() {
  const container = document.getElementById('gameContainer');
  const controlsHeight = isMobile ? 150 : 0; // Reserve space for controls
  const safeAreaTop = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sat') || '0');
  const safeAreaBottom = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sab') || '0');
  
  if (isMobile) {
    // Mobile: use full width minus borders, adjust height for controls
    const maxWidth = container.clientWidth - 4; // Account for 2px borders
    const maxHeight = container.clientHeight - controlsHeight - safeAreaTop - safeAreaBottom - 4;
    
    // Set canvas internal resolution
    cvs.width = maxWidth;
    cvs.height = maxHeight;
    
    // Set CSS size to match (prevents distortion)
    cvs.style.width = maxWidth + 'px';
    cvs.style.height = maxHeight + 'px';
  } else {
    // Desktop: maintain aspect ratio
    const maxWidth = container.clientWidth - 4;
    const maxHeight = container.clientHeight - 4;
    const aspectRatio = 4/3;
    
    let width = maxWidth;
    let height = width / aspectRatio;
    
    if (height > maxHeight) {
      height = maxHeight;
      width = height * aspectRatio;
    }
    
    // Set canvas internal resolution
    cvs.width = Math.min(width, 1024);
    cvs.height = Math.min(height, 768);
    
    // Set CSS size to match (prevents distortion)
    cvs.style.width = cvs.width + 'px';
    cvs.style.height = cvs.height + 'px';
  }
}
// Game state
let gameStarted = false;

// Initialize canvas size but don't start game
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Show controls function
function showControls() {
  if (isMobile) {
    document.getElementById('controls').style.display = 'block';
  }
}

// Start game function
function startGame() {
  gameStarted = true;
  document.getElementById('startScreen').style.display = 'none';
  document.getElementById('hud').style.display = 'flex';
  showControls();
  requestAnimationFrame(gameLoop);
}

// Add start button listener
document.getElementById('startBtn').addEventListener('click', startGame);
document.getElementById('startBtn').addEventListener('touchstart', (e) => {
  e.preventDefault();
  startGame();
});

// Mute button functionality
const muteBtn = document.getElementById('muteBtn');
muteBtn.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  muteBtn.textContent = soundEnabled ? '🔊' : '🔇';
});

/* ---------- INPUT SYSTEM ---------- */
const keys = {};
let mouse = {x:0,y:0};
let joystickActive = false;
let joystickVector = {x:0,y:0};

// Desktop controls
if (!isMobile) {
  window.onkeydown = e => {
    keys[e.code] = true;
    // Toggle Omnitrix with Q key on desktop
    if(e.code === 'KeyQ') {
      e.preventDefault();
      omniOpen = !omniOpen;
      if(omniOpen) {
        omniTimer = 5000; // 5 seconds auto-close (validated range)
      } else {
        omniTimer = 0;
      }
    }
    
    // Number keys to select aliens when Omnitrix is open
    if(omniOpen && e.code >= 'Digit1' && e.code <= 'Digit5') {
      e.preventDefault();
      const num = parseInt(e.code.replace('Digit', ''));
      const alienList = Object.keys(aliens);
      if(num <= alienList.length) {
        const newForm = alienList[num - 1];
        if(newForm !== player.form) {
          player.form = newForm;
          player.hp = Math.min(player.hp, aliens[newForm].hp);
          player.maxHp = aliens[newForm].hp;
          createParticles(player.x, player.y, aliens[newForm].color, 20);
          sounds.transform();
          omniOpen = false;
          omniTimer = 0;
        }
      }
    }
  };
  window.onkeyup   = e => keys[e.code] = false;
  cvs.onmousemove = e => { 
    const r=cvs.getBoundingClientRect(); 
    mouse.x=(e.clientX-r.left)*(cvs.width/r.width); 
    mouse.y=(e.clientY-r.top)*(cvs.height/r.height); 
  };
  cvs.onmousedown = e => {
    // Check if clicking on Omnitrix wheel
    if(omniOpen) {
      const cx = player.x;
      const cy = player.y - 100;
      const radius = 80;
      const dx = mouse.x - cx;
      const dy = mouse.y - cy;
      const dist = Math.hypot(dx, dy);
      
      if(dist > radius + 20) {
        // Click outside wheel - close it
        omniOpen = false;
        omniTimer = 0;
      } else {
        keys['Mouse0'] = true;
      }
    } else {
      keys['Mouse0'] = true;
    }
  };
  cvs.onmouseup   = e => keys['Mouse0'] = false;
}
cvs.oncontextmenu = e => e.preventDefault();

// Mobile controls
if (isMobile) {
  const joystick = document.getElementById('joystick');
  const knob = document.getElementById('joystickKnob');
  const attackBtn = document.getElementById('attackBtn');
  const omniBtn = document.getElementById('omniBtn');
  
  // Virtual joystick
  function handleTouch(e, isStart) {
    e.preventDefault();
    const touch = e.touches[0];
    if (!touch && !isStart) {
      joystickActive = false;
      joystickVector = {x:0,y:0};
      knob.style.left = '32.5px';
      knob.style.top = '32.5px';
      return;
    }
    
    if (touch) {
      const rect = joystick.getBoundingClientRect();
      const centerX = rect.left + rect.width/2;
      const centerY = rect.top + rect.height/2;
      const dx = touch.clientX - centerX;
      const dy = touch.clientY - centerY;
      const distance = Math.min(Math.hypot(dx,dy), 32.5);
      const angle = Math.atan2(dy,dx);
      
      joystickActive = true;
      joystickVector.x = Math.cos(angle) * (distance/32.5);
      joystickVector.y = Math.sin(angle) * (distance/32.5);
      
      knob.style.left = (32.5 + Math.cos(angle)*distance) + 'px';
      knob.style.top = (32.5 + Math.sin(angle)*distance) + 'px';
    }
  }
  
  joystick.addEventListener('touchstart', e => handleTouch(e, true));
  joystick.addEventListener('touchmove', handleTouch);
  joystick.addEventListener('touchend', e => handleTouch(e, false));
  
  // Attack button
  attackBtn.addEventListener('touchstart', e => { e.preventDefault(); keys['Attack'] = true; });
  attackBtn.addEventListener('touchend', e => { e.preventDefault(); keys['Attack'] = false; });
  
  // Omnitrix button - toggle wheel on tap
  omniBtn.addEventListener('touchstart', e => { 
    e.preventDefault(); 
    e.stopPropagation();
    omniOpen = !omniOpen;
    omniBtn.classList.toggle('active', omniOpen);
    if(omniOpen) {
      omniTimer = 5000; // 5 seconds auto-close (validated range)
      document.getElementById('omniHelp').style.display = 'block';
      document.getElementById('omniHelp').textContent = 'Tap an alien to transform';
    } else {
      omniTimer = 0;
      document.getElementById('omniHelp').style.display = 'none';
    }
  });
  
  // Touch for aiming and Omnitrix selection
  cvs.addEventListener('touchstart', e => {
    e.preventDefault();
    const touch = e.touches[0];
    const r = cvs.getBoundingClientRect();
    mouse.x = (touch.clientX-r.left)*(cvs.width/r.width);
    mouse.y = (touch.clientY-r.top)*(cvs.height/r.height);
    
    // Check if Omnitrix is open
    if(omniOpen) {
      const cx = cvs.width/2;
      const cy = cvs.height/2;
      const radius = 100;
      const dx = mouse.x - cx;
      const dy = mouse.y - cy;
      const dist = Math.hypot(dx, dy);
      
      if(dist < radius && dist > 20) {
        // Tap on wheel - select alien
        keys['Mouse0'] = true;
        setTimeout(() => {
          keys['Mouse0'] = false;
          omniOpen = false;
          omniTimer = 0;
          document.getElementById('omniBtn').classList.remove('active');
          document.getElementById('omniHelp').style.display = 'none';
        }, 100);
      } else if(dist > radius + 20) {
        // Tap outside wheel - close it
        omniOpen = false;
        omniTimer = 0;
        document.getElementById('omniBtn').classList.remove('active');
        document.getElementById('omniHelp').style.display = 'none';
      }
    }
  });
  
  cvs.addEventListener('touchmove', e => {
    e.preventDefault();
    const touch = e.touches[0];
    const r = cvs.getBoundingClientRect();
    mouse.x = (touch.clientX-r.left)*(cvs.width/r.width);
    mouse.y = (touch.clientY-r.top)*(cvs.height/r.height);
  });
}

/* ---------- ASSETS ---------- */
// Create Ben sprite programmatically
const benCanvas = document.createElement('canvas');
benCanvas.width = 64;
benCanvas.height = 64;
const benCtx = benCanvas.getContext('2d');

// Draw Ben 10 sprite
benCtx.save();
benCtx.translate(32, 32);

// Hair
benCtx.fillStyle = '#3d2314';
benCtx.fillRect(-12, -28, 24, 12);
benCtx.fillRect(-10, -30, 20, 4);

// Head
benCtx.fillStyle = '#fdbcb4';
benCtx.fillRect(-10, -20, 20, 20);
benCtx.fillRect(-12, -18, 24, 16);

// Eyes
benCtx.fillStyle = '#000';
benCtx.fillRect(-7, -15, 4, 4);
benCtx.fillRect(3, -15, 4, 4);
benCtx.fillStyle = '#fff';
benCtx.fillRect(-6, -14, 1, 1);
benCtx.fillRect(4, -14, 1, 1);

// Mouth
benCtx.fillStyle = '#000';
benCtx.fillRect(-2, -7, 4, 1);

// Body - green shirt
benCtx.fillStyle = '#228b22';
benCtx.fillRect(-12, 0, 24, 20);
benCtx.fillRect(-14, 2, 28, 16);

// White stripe and 10
benCtx.fillStyle = '#fff';
benCtx.fillRect(-2, 2, 4, 16);
benCtx.fillStyle = '#000';
benCtx.font = 'bold 8px Arial';
benCtx.fillText('10', -5, 12);

// Arms
benCtx.fillStyle = '#fdbcb4';
benCtx.fillRect(-16, 4, 4, 12);
benCtx.fillRect(12, 4, 4, 12);
benCtx.fillRect(-17, 16, 6, 4);
benCtx.fillRect(11, 16, 6, 4);

// Omnitrix
benCtx.fillStyle = '#000';
benCtx.fillRect(-16, 14, 4, 3);
benCtx.fillStyle = '#0f0';
benCtx.fillRect(-15, 15, 2, 1);

// Legs
benCtx.fillStyle = '#4a5d23';
benCtx.fillRect(-8, 20, 6, 8);
benCtx.fillRect(2, 20, 6, 8);

// Shoes
benCtx.fillStyle = '#000';
benCtx.fillRect(-9, 28, 8, 4);
benCtx.fillRect(1, 28, 8, 4);
benCtx.fillStyle = '#fff';
benCtx.fillRect(-8, 29, 6, 1);
benCtx.fillRect(2, 29, 6, 1);

benCtx.restore();

// Convert to image
const benImg = new Image();
benImg.src = benCanvas.toDataURL();

// Mark as complete since it's a data URL
benImg.onload = function() {
  console.log('Ben sprite loaded');
};

/* ---------- SOUND SYSTEM ---------- */
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
let soundEnabled = true;

// Sound effect functions
function playSound(type, frequency = 440, duration = 0.1, volume = 0.3) {
  if (!soundEnabled) return;
  
  try {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
    
    switch(type) {
      case 'shoot':
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.5, audioContext.currentTime + duration);
        break;
        
      case 'hit':
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.25, audioContext.currentTime + duration);
        break;
        
      case 'pickup':
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(frequency * 2, audioContext.currentTime + duration * 0.5);
        oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.5, audioContext.currentTime + duration);
        break;
        
      case 'transform':
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(frequency * 0.5, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(frequency * 2, audioContext.currentTime + duration * 0.5);
        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime + duration * 0.5);
        break;
    }
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
  } catch(e) {
    console.warn('Audio error:', e);
  }
}

// Specific sound effects
const sounds = {
  shoot: () => playSound('shoot', 300, 0.1, 0.2),
  enemyHit: () => playSound('hit', 150, 0.2, 0.3),
  pickup: () => playSound('pickup', 800, 0.3, 0.2),
  transform: () => playSound('transform', 400, 0.5, 0.3),
  playerHurt: () => playSound('hit', 100, 0.3, 0.4)
};

/* ---------- GAME STATE ---------- */
const player = {
  x:400,y:300, hp:100, maxHp:100, speed:4,
  form:'ben', cooldown:0, invulnerable:0, score:0,
  animFrame: 0,
  animTime: 0,
  facing: 1, // 1 for right, -1 for left
  moving: false,
  pets:[
    {type:'stinkfly', x:0,y:0, cooldown:0, color:'#0f8'},
    {type:'heatblast',x:0,y:0, cooldown:0, color:'#f50'},
    {type:'grey',     x:0,y:0, cooldown:0, color:'#88f'}
  ]
};

const aliens = {
  ben:       {hp:100,speed:4,atk:10,color:'#2a5',range:150},
  heatblast: {hp:120,speed:3.5,atk:20,color:'#f50',range:250},
  fourarms:  {hp:180,speed:2.5,atk:30,color:'#c55',range:80},
  xlr8:      {hp:80, speed:7,atk:12,color:'#0cf',range:120},
  cannonbolt:{hp:160,speed:5,atk:25,color:'#fb0',range:100}
};

const enemyTypes = {
  basic: {hp:30,speed:1,atk:10,color:'#a0a',size:30,score:10},
  fast:  {hp:20,speed:2.5,atk:8,color:'#f0f',size:25,score:15},
  tank:  {hp:60,speed:0.5,atk:15,color:'#808',size:40,score:20},
  ranged:{hp:25,speed:1,atk:12,color:'#f8a',size:28,score:25,range:150}
};

let enemies = [];
let projectiles = [];
let particles = [];
let pickups = [];
let wave = 1;
let omniOpen = false;
let omniTimer = 0;

/* ---------- ENEMY SPRITES ---------- */
function drawEnemySprite(x, y, type) {
  ctx.save();
  ctx.translate(x, y);
  const et = enemyTypes[type];
  
  switch(type) {
    case 'basic':
      // Robot body
      ctx.fillStyle = '#808';
      ctx.fillRect(-15, -15, 30, 30);
      
      // Purple accents
      ctx.fillStyle = '#a0a';
      ctx.fillRect(-12, -12, 24, 8);
      ctx.fillRect(-5, 5, 10, 10);
      
      // Eyes
      ctx.fillStyle = '#f00';
      ctx.fillRect(-8, -8, 4, 4);
      ctx.fillRect(4, -8, 4, 4);
      
      // Antenna
      ctx.strokeStyle = '#a0a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -15);
      ctx.lineTo(0, -20);
      ctx.stroke();
      ctx.fillStyle = '#f0f';
      ctx.beginPath();
      ctx.arc(0, -20, 3, 0, Math.PI*2);
      ctx.fill();
      break;
      
    case 'fast':
      // Sleek triangular body
      ctx.fillStyle = '#d0d';
      ctx.beginPath();
      ctx.moveTo(0, -15);
      ctx.lineTo(-12, 10);
      ctx.lineTo(12, 10);
      ctx.closePath();
      ctx.fill();
      
      // Speed stripes
      ctx.fillStyle = '#f0f';
      ctx.fillRect(-8, -5, 16, 2);
      ctx.fillRect(-6, 0, 12, 2);
      
      // Eye visor
      ctx.fillStyle = '#ff0';
      ctx.fillRect(-8, -10, 16, 4);
      break;
      
    case 'tank':
      // Heavy armor plating
      ctx.fillStyle = '#555';
      ctx.fillRect(-20, -20, 40, 40);
      
      // Dark details
      ctx.fillStyle = '#333';
      ctx.fillRect(-20, -20, 40, 8);
      ctx.fillRect(-20, 12, 40, 8);
      
      // Purple core
      ctx.fillStyle = '#808';
      ctx.fillRect(-10, -10, 20, 20);
      
      // Glowing eyes
      ctx.fillStyle = '#f00';
      ctx.fillRect(-12, -5, 6, 6);
      ctx.fillRect(6, -5, 6, 6);
      
      // Armor studs
      ctx.fillStyle = '#999';
      for(let i = -15; i <= 15; i += 10) {
        ctx.beginPath();
        ctx.arc(i, 0, 3, 0, Math.PI*2);
        ctx.fill();
      }
      break;
      
    case 'ranged':
      // Body with cannon
      ctx.fillStyle = '#a66';
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI*2);
      ctx.fill();
      
      // Cannon barrel
      ctx.fillStyle = '#644';
      ctx.fillRect(10, -4, 15, 8);
      
      // Energy core
      ctx.fillStyle = '#f8a';
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI*2);
      ctx.fill();
      
      // Targeting eye
      ctx.fillStyle = '#ff0';
      ctx.beginPath();
      ctx.arc(0, -3, 4, 0, Math.PI*2);
      ctx.fill();
      ctx.fillStyle = '#f00';
      ctx.beginPath();
      ctx.arc(0, -3, 2, 0, Math.PI*2);
      ctx.fill();
      break;
      
    default:
      // Fallback enemy
      ctx.fillStyle = et.color;
      ctx.beginPath();
      ctx.arc(0, 0, et.size/2, 0, Math.PI*2);
      ctx.fill();
  }
  
  ctx.restore();
}

/* ---------- ALIEN SPRITES ---------- */
function drawAlienSprite(x, y, form, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  
  switch(form) {
    case 'ben':
      // Use our custom sprite
      if(benImg.complete) {
        const imgScale = 1.0; // Full size for pixel art sprite
        ctx.scale(player.facing, 1);
        ctx.drawImage(benImg,
          -benImg.width*imgScale/2,
          -benImg.height*imgScale/2,
          benImg.width*imgScale,
          benImg.height*imgScale);
      } else {
        // Fallback Ben sprite while loading
        ctx.fillStyle = '#2a5';
        ctx.fillRect(-20, -25, 40, 50);
        ctx.fillStyle = '#fff';
        ctx.fillRect(-15, -20, 10, 10);
        ctx.fillRect(5, -20, 10, 10);
      }
      break;
      
    case 'heatblast':
      // Flame body
      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 30);
      gradient.addColorStop(0, '#ff0');
      gradient.addColorStop(0.5, '#f50');
      gradient.addColorStop(1, '#a00');
      ctx.fillStyle = gradient;
      
      // Flame shape
      ctx.beginPath();
      ctx.moveTo(0, -30);
      ctx.quadraticCurveTo(-20, -20, -15, 0);
      ctx.quadraticCurveTo(-10, 20, 0, 25);
      ctx.quadraticCurveTo(10, 20, 15, 0);
      ctx.quadraticCurveTo(20, -20, 0, -30);
      ctx.fill();
      
      // Eyes
      ctx.fillStyle = '#ff0';
      ctx.fillRect(-8, -15, 5, 8);
      ctx.fillRect(3, -15, 5, 8);
      break;
      
    case 'fourarms':
      // Body
      ctx.fillStyle = '#c55';
      ctx.fillRect(-20, -20, 40, 40);
      
      // Four arms
      ctx.fillRect(-35, -15, 15, 10);
      ctx.fillRect(20, -15, 15, 10);
      ctx.fillRect(-35, 5, 15, 10);
      ctx.fillRect(20, 5, 15, 10);
      
      // Face
      ctx.fillStyle = '#833';
      ctx.fillRect(-15, -15, 30, 20);
      
      // Eyes
      ctx.fillStyle = '#0f0';
      ctx.fillRect(-10, -10, 6, 6);
      ctx.fillRect(4, -10, 6, 6);
      break;
      
    case 'xlr8':
      // Sleek body
      ctx.fillStyle = '#0cf';
      ctx.beginPath();
      ctx.ellipse(0, 0, 15, 25, 0, 0, Math.PI*2);
      ctx.fill();
      
      // Speed lines
      ctx.strokeStyle = '#0cf';
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.5;
      for(let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(-20 - i*5, -10 + i*5);
        ctx.lineTo(-30 - i*5, -10 + i*5);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      
      // Visor
      ctx.fillStyle = '#0f0';
      ctx.fillRect(-12, -10, 24, 8);
      break;
      
    case 'cannonbolt':
      // Armored ball
      ctx.fillStyle = '#fb0';
      ctx.beginPath();
      ctx.arc(0, 0, 25, 0, Math.PI*2);
      ctx.fill();
      
      // Armor plates
      ctx.strokeStyle = '#a80';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 25, 0, Math.PI*2);
      ctx.stroke();
      
      // Segments
      for(let a = 0; a < Math.PI*2; a += Math.PI/3) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a)*25, Math.sin(a)*25);
        ctx.stroke();
      }
      
      // Eyes
      ctx.fillStyle = '#000';
      ctx.fillRect(-8, -5, 5, 5);
      ctx.fillRect(3, -5, 5, 5);
      break;
      
    default:
      // Generic alien
      ctx.fillStyle = aliens[form]?.color || '#888';
      ctx.beginPath();
      ctx.arc(0, 0, 25, 0, Math.PI*2);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      ctx.stroke();
  }
  
  ctx.restore();
}

/* ---------- PARTICLES ---------- */
function createParticles(x,y,color,count=10) {
  for(let i=0;i<count;i++) {
    particles.push({
      x,y,
      vx:(Math.random()-0.5)*4,
      vy:(Math.random()-0.5)*4,
      life:30,
      color,
      size:Math.random()*3+2
    });
  }
}

/* ---------- PICKUPS ---------- */
function spawnPickup(x,y) {
  if(Math.random()<0.15) { // 15% chance
    pickups.push({
      x,y,
      type:'health',
      value:20,
      life:300
    });
  }
}

/* ---------- OMNITRIX WHEEL ---------- */
function drawWheel() {
  // Position wheel in center of screen on mobile for easier access
  const cx = isMobile ? cvs.width/2 : player.x;
  const cy = isMobile ? cvs.height/2 : player.y-100;
  const radius = isMobile ? 100 : 80;
  
  ctx.save();
  ctx.globalAlpha = 0.95;
  
  // Background
  ctx.fillStyle='#000';
  ctx.beginPath();
  ctx.arc(cx,cy,radius,0,Math.PI*2);
  ctx.fill();
  
  // Green rim
  ctx.strokeStyle='#0f0';
  ctx.lineWidth=3;
  ctx.stroke();
  
  const list = Object.keys(aliens);
  const slice = Math.PI*2 / list.length;
  
  // Calculate selected based on mouse/touch position
  const dx = mouse.x - cx, dy = mouse.y - cy;
  let selectedIdx = -1;
  if (Math.hypot(dx,dy) < radius && Math.hypot(dx,dy) > 20) {
    let angle = Math.atan2(dy,dx) + Math.PI/2;
    if(angle < 0) angle += Math.PI*2;
    selectedIdx = Math.floor(angle/slice) % list.length;
  }
  
  list.forEach((name,i)=>{
    const angle = slice*i - Math.PI/2;
    const x = cx + Math.cos(angle)*radius*0.6;
    const y = cy + Math.sin(angle)*radius*0.6;
    
    // Highlight selected
    if(i === selectedIdx) {
      ctx.fillStyle='rgba(0,255,0,0.3)';
      ctx.beginPath();
      ctx.moveTo(cx,cy);
      ctx.arc(cx,cy,radius,angle-slice/2,angle+slice/2);
      ctx.closePath();
      ctx.fill();
    }
    
    // Alien icon
    drawAlienSprite(x, y, name, 0.8);
    
    // Name
    ctx.fillStyle='#fff';
    ctx.font='bold 12px Arial';
    ctx.textAlign='center';
    ctx.fillText(name.toUpperCase(),x,y+4);
    
    // Number shortcut
    ctx.fillStyle='#0f0';
    ctx.font='bold 16px Arial';
    ctx.fillText((i+1).toString(), x, y-30);
  });
  
  // Center
  ctx.fillStyle='#0f0';
  ctx.beginPath();
  ctx.arc(cx,cy,15,0,Math.PI*2);
  ctx.fill();
  
  ctx.restore();
}

/* ---------- GAME LOOP ---------- */
let last=0;
function gameLoop(ts){
  if (!gameStarted) return;
  const dt = Math.min(Math.max(ts-last, 0), 50); // Cap dt and ensure non-negative
  last=ts;
  update(dt);
  render();
  requestAnimationFrame(gameLoop);
}

function update(dt){
  // Handle invulnerability
  if(player.invulnerable > 0) player.invulnerable -= dt;
  
  // Handle Omnitrix auto-close timer
  if(omniOpen && omniTimer > 0) {
    omniTimer -= dt;
    if(omniTimer <= 0) {
      omniOpen = false;
      if(isMobile) {
        document.getElementById('omniBtn').classList.remove('active');
        document.getElementById('omniHelp').style.display = 'none';
      }
    }
  }
  
  // Omnitrix toggle - removed, now handled by button press
  
  // Movement
  let dx=0, dy=0;
  if(joystickActive) {
    dx = joystickVector.x;
    dy = joystickVector.y;
  } else {
    if(keys['KeyW']||keys['ArrowUp'])    dy--;
    if(keys['KeyS']||keys['ArrowDown'])  dy++;
    if(keys['KeyA']||keys['ArrowLeft'])  dx--;
    if(keys['KeyD']||keys['ArrowRight']) dx++;
    const len = Math.hypot(dx,dy);
    if(len){ dx/=len; dy/=len; }
  }
  
  const spd = aliens[player.form].speed;
  const margin = 25; // Increased margin for mobile
  const oldX = player.x;
  player.x = Math.max(margin,Math.min(cvs.width-margin, player.x+dx*spd));
  player.y = Math.max(margin,Math.min(cvs.height-margin, player.y+dy*spd));
  
  // Update animation state
  player.moving = (dx !== 0 || dy !== 0);
  if(dx !== 0) {
    player.facing = dx > 0 ? 1 : -1;
  }
  
  // Animation frame handling removed - using static sprite
  
  // Pets follow and attack
  player.pets.forEach((p,i)=>{
    const angle = Date.now()/500 + i*Math.PI*2/3;
    p.x = player.x + Math.cos(angle)*60;
    p.y = player.y + Math.sin(angle)*60;
    
    // Pet attacks
    if(p.cooldown > 0) p.cooldown -= dt;
    if(p.cooldown <= 0 && enemies.length > 0) {
      // Find nearest enemy
      let nearest = null;
      let minDist = Infinity;
      enemies.forEach(e => {
        const dist = Math.hypot(e.x-p.x, e.y-p.y);
        if(dist < minDist && dist < 150) {
          minDist = dist;
          nearest = e;
        }
      });
      
      if(nearest) {
        const a = Math.atan2(nearest.y-p.y, nearest.x-p.x);
        projectiles.push({
          x:p.x, y:p.y,
          vx:Math.cos(a)*6, vy:Math.sin(a)*6,
          life:20,
          dmg:5,
          color:p.color,
          isPet:true
        });
        p.cooldown = 1000;
      }
    }
  });
  
  // Player attack
  if(player.cooldown>0) player.cooldown-=dt;
  if((keys['Mouse0'] || keys['Attack'] || keys['Space']) && !omniOpen && player.cooldown<=0){
    // Auto-aim for mobile
    let targetX = mouse.x;
    let targetY = mouse.y;
    
    if(isMobile && enemies.length > 0) {
      // Find nearest enemy for auto-aim
      let nearest = enemies[0];
      let minDist = Math.hypot(enemies[0].x-player.x, enemies[0].y-player.y);
      enemies.forEach(e => {
        const dist = Math.hypot(e.x-player.x, e.y-player.y);
        if(dist < minDist) {
          minDist = dist;
          nearest = e;
        }
      });
      targetX = nearest.x;
      targetY = nearest.y;
    }
    
    const a = Math.atan2(targetY-player.y, targetX-player.x);
    const range = aliens[player.form].range;
    
    // Special attacks for different forms
    if(player.form === 'heatblast') {
      // Fire spread
      for(let i=-1; i<=1; i++) {
        projectiles.push({
          x:player.x, y:player.y,
          vx:Math.cos(a+i*0.2)*8, vy:Math.sin(a+i*0.2)*8,
          life:range/8,
          dmg: aliens[player.form].atk,
          color: '#ff5500',
          size: 8
        });
      }
      sounds.shoot();
    } else if(player.form === 'cannonbolt') {
      // Big projectile
      projectiles.push({
        x:player.x, y:player.y,
        vx:Math.cos(a)*6, vy:Math.sin(a)*6,
        life:range/6,
        dmg: aliens[player.form].atk,
        color: aliens[player.form].color,
        size: 15
      });
      sounds.shoot();
    } else {
      // Normal projectile
      projectiles.push({
        x:player.x, y:player.y,
        vx:Math.cos(a)*10, vy:Math.sin(a)*10,
        life:range/10,
        dmg: aliens[player.form].atk,
        color: aliens[player.form].color,
        size: 6
      });
      sounds.shoot();
    }
    player.cooldown = player.form === 'xlr8' ? 150 : 300;
  }
  
  // Omnitrix selection
  if (omniOpen && keys['Mouse0']) {
    const cx = isMobile ? cvs.width/2 : player.x;
    const cy = isMobile ? cvs.height/2 : player.y - 100;
    const radius = isMobile ? 100 : 80;
    const dx = mouse.x - cx, dy = mouse.y - cy;
    if (Math.hypot(dx, dy) < radius && Math.hypot(dx, dy) > 20) {
      const list = Object.keys(aliens);
      const slice = Math.PI * 2 / list.length;
      let angle = Math.atan2(dy, dx) + Math.PI / 2;
      if (angle < 0) angle += Math.PI * 2;
      const idx = Math.floor(angle / slice) % list.length;
      const newForm = list[idx];
      if(newForm !== player.form) {
        player.form = newForm;
        player.hp = Math.min(player.hp, aliens[newForm].hp);
        player.maxHp = aliens[newForm].hp;
        createParticles(player.x, player.y, aliens[newForm].color, 20);
        sounds.transform();
        
        // Close Omnitrix after selection
        omniOpen = false;
        omniTimer = 0;
        if(isMobile) {
          document.getElementById('omniBtn').classList.remove('active');
          document.getElementById('omniHelp').style.display = 'none';
        }
      }
    }
  }
  
  // Update projectiles - Limit array size to prevent memory exhaustion
  projectiles = projectiles.filter(p=>{
    p.x+=p.vx; p.y+=p.vy; p.life--;
    return p.life>0 && p.x>0 && p.x<cvs.width && p.y>0 && p.y<cvs.height;
  });
  
  // Limit projectiles array to prevent memory exhaustion
  if(projectiles.length > 100) {
    projectiles = projectiles.slice(-100);
  }
  
  // Update particles - Limit array size to prevent memory exhaustion
  particles = particles.filter(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.2; // gravity
    p.life--;
    return p.life > 0;
  });
  
  // Limit particles array to prevent memory exhaustion
  if(particles.length > 500) {
    particles = particles.slice(-500);
  }
  
  // Update pickups
  pickups = pickups.filter(p => {
    p.life--;
    // Check collection
    if(Math.hypot(p.x-player.x, p.y-player.y) < 30) {
      if(p.type === 'health') {
        player.hp = Math.min(player.maxHp, player.hp + p.value);
        createParticles(p.x, p.y, '#0f0', 15);
        sounds.pickup();
      }
      return false;
    }
    return p.life > 0;
  });
  
  // Spawn enemies - Limit wave size to prevent performance issues
  if(enemies.length === 0){
    const maxEnemies = Math.min(wave + 2, 20); // Cap at 20 enemies per wave
    for(let i=0; i<maxEnemies; i++){
      const types = Object.keys(enemyTypes);
      const typeChance = Math.random();
      let type = 'basic';
      
      if(wave > 2 && typeChance < 0.3) type = 'fast';
      if(wave > 4 && typeChance < 0.2) type = 'tank';
      if(wave > 6 && typeChance < 0.15) type = 'ranged';
      
      const side = Math.floor(Math.random()*4);
      let x,y;
      switch(side) {
        case 0: x=Math.random()*cvs.width; y=-30; break;
        case 1: x=cvs.width+30; y=Math.random()*cvs.height; break;
        case 2: x=Math.random()*cvs.width; y=cvs.height+30; break;
        case 3: x=-30; y=Math.random()*cvs.height; break;
      }
      
      enemies.push({
        x, y,
        type,
        hp: enemyTypes[type].hp + wave*2,
        maxHp: enemyTypes[type].hp + wave*2,
        speed: enemyTypes[type].speed,
        hitCooldown: 0,
        shootCooldown: 0
      });
    }
    wave++;
  }
  
  // Update enemies
  enemies.forEach(e=>{
    const et = enemyTypes[e.type];
    
    if(e.hitCooldown > 0) e.hitCooldown -= dt;
    
    // Movement (except ranged which keeps distance)
    if(e.type !== 'ranged' || Math.hypot(player.x-e.x,player.y-e.y) > 200) {
      const a = Math.atan2(player.y-e.y,player.x-e.x);
      e.x += Math.cos(a)*et.speed;
      e.y += Math.sin(a)*et.speed;
    }
    
    // Ranged enemy shoots
    if(e.type === 'ranged') {
      if(e.shootCooldown > 0) e.shootCooldown -= dt;
      if(e.shootCooldown <= 0 && Math.hypot(player.x-e.x,player.y-e.y) < et.range) {
        const a = Math.atan2(player.y-e.y,player.x-e.x);
        projectiles.push({
          x:e.x, y:e.y,
          vx:Math.cos(a)*5, vy:Math.sin(a)*5,
          life:30,
          dmg:et.atk,
          color:'#f88',
          isEnemy:true,
          size:4
        });
        e.shootCooldown = 2000;
      }
    }
    
    // Contact damage
    if(Math.hypot(player.x-e.x,player.y-e.y) < 30 && e.hitCooldown <= 0 && player.invulnerable <= 0){
      player.hp = Math.max(0, player.hp-et.atk);
      player.invulnerable = 1000; // 1 second of invulnerability
      e.hitCooldown = 1000;
      createParticles(player.x, player.y, '#f00', 10);
    }
  });
  
  // Projectile collisions
  projectiles.forEach(p=>{
    if(!p.isEnemy) {
      // Player/pet projectiles hit enemies
      enemies.forEach(e=>{
        const et = enemyTypes[e.type];
        if(Math.hypot(p.x-e.x,p.y-e.y) < et.size/2 + (p.size||6)/2){
          e.hp -= p.dmg;
          p.life = 0;
          createParticles(e.x, e.y, et.color, 5);
          sounds.enemyHit();
          
          if(e.hp <= 0) {
            const points = et.score * wave;
            player.score += points;
            createParticles(e.x, e.y, et.color, 15);
            spawnPickup(e.x, e.y);
            
            // Show score popup - Sanitize points value
            particles.push({
              x: e.x,
              y: e.y - 20,
              vx: 0,
              vy: -1,
              life: 60,
              color: '#ff0',
              size: 0,
              text: `+${Math.floor(points)}`,
              isText: true
            });
          }
        }
      });
    } else {
      // Enemy projectiles hit player
      if(Math.hypot(p.x-player.x,p.y-player.y) < 20 && player.invulnerable <= 0){
        player.hp = Math.max(0, player.hp-p.dmg);
        player.invulnerable = 1000;
        p.life = 0;
        createParticles(player.x, player.y, '#f00', 10);
        sounds.playerHurt();
      }
    }
  });
  
  // Remove dead enemies
  enemies = enemies.filter(e=>e.hp>0);
  
  // Game over - Sanitize values in alert
  if(player.hp <= 0){
    alert(`Game Over! Score: ${Math.floor(player.score)}\nYou reached wave ${Math.floor(wave)}`);
    location.reload();
  }
  
  // Update HUD - Sanitize all values to prevent XSS
  document.getElementById('hp').textContent = Math.floor(player.hp);
  document.getElementById('wave').textContent = Math.floor(wave);
  document.getElementById('form').textContent = String(player.form).charAt(0).toUpperCase() + String(player.form).slice(1);
  document.getElementById('scoreVal').textContent = Math.floor(player.score);
}

function render(){
  ctx.clearRect(0,0,cvs.width,cvs.height);
  
  // Grid background
  ctx.strokeStyle = 'rgba(0,255,255,0.05)';
  ctx.lineWidth = 1;
  for(let x=0; x<cvs.width; x+=50) {
    ctx.beginPath();
    ctx.moveTo(x,0);
    ctx.lineTo(x,cvs.height);
    ctx.stroke();
  }
  for(let y=0; y<cvs.height; y+=50) {
    ctx.beginPath();
    ctx.moveTo(0,y);
    ctx.lineTo(cvs.width,y);
    ctx.stroke();
  }
  
  // Draw pickups
  pickups.forEach(p => {
    ctx.save();
    ctx.globalAlpha = p.life/300;
    ctx.fillStyle = '#0f0';
    ctx.fillRect(p.x-10, p.y-10, 20, 20);
    ctx.fillStyle = '#fff';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('+', p.x, p.y+5);
    ctx.restore();
  });
  
  // Draw particles
  particles.forEach(p => {
    ctx.save();
    if(p.isText) {
      ctx.globalAlpha = p.life/60;
      ctx.fillStyle = p.color;
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(p.text, p.x, p.y);
    } else {
      ctx.globalAlpha = p.life/30;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x-p.size/2, p.y-p.size/2, p.size, p.size);
    }
    ctx.restore();
  });
  
  // Draw pets
  player.pets.forEach((p, i)=>{
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(0.5, 0.5);
    
    // Draw mini versions of aliens as pets
    if(i === 0) { // Stinkfly
      ctx.fillStyle = '#0f8';
      ctx.beginPath();
      ctx.ellipse(0, 0, 15, 10, 0, 0, Math.PI*2);
      ctx.fill();
      // Wings
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.ellipse(-15, 0, 10, 20, -Math.PI/4, 0, Math.PI*2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(15, 0, 10, 20, Math.PI/4, 0, Math.PI*2);
      ctx.fill();
      ctx.globalAlpha = 1;
    } else if(i === 1) { // Mini Heatblast
      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 15);
      gradient.addColorStop(0, '#ff0');
      gradient.addColorStop(1, '#f50');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI*2);
      ctx.fill();
    } else { // Grey Matter
      ctx.fillStyle = '#88f';
      ctx.beginPath();
      ctx.ellipse(0, -5, 12, 15, 0, 0, Math.PI*2);
      ctx.fill();
      // Big eyes
      ctx.fillStyle = '#000';
      ctx.fillRect(-6, -5, 5, 6);
      ctx.fillRect(1, -5, 5, 6);
    }
    
    ctx.restore();
  });
  
  // Draw player
  if(player.invulnerable > 0 && Math.floor(player.invulnerable/100) % 2) {
    ctx.globalAlpha = 0.5;
  }
  
  drawAlienSprite(player.x, player.y, player.form, 1);
  ctx.globalAlpha = 1;
  
  // Health bar
  const barWidth = 40;
  const barHeight = 4;
  ctx.fillStyle = '#333';
  ctx.fillRect(player.x-barWidth/2, player.y-35, barWidth, barHeight);
  ctx.fillStyle = '#0f0';
  ctx.fillRect(player.x-barWidth/2, player.y-35, barWidth*(player.hp/player.maxHp), barHeight);
  
  // Draw enemies
  enemies.forEach(e=>{
    const et = enemyTypes[e.type];
    
    // Draw enemy sprite
    drawEnemySprite(e.x, e.y, e.type);
    
    // Enemy health bar
    if(e.hp < e.maxHp) {
      ctx.fillStyle = '#333';
      ctx.fillRect(e.x-20, e.y-et.size/2-10, 40, 3);
      ctx.fillStyle = '#f00';
      ctx.fillRect(e.x-20, e.y-et.size/2-10, 40*(e.hp/e.maxHp), 3);
    }
  });
  
  // Draw projectiles
  projectiles.forEach(p=>{
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size || 5, 0, Math.PI*2);
    ctx.fill();
  });
  
  // Draw Omnitrix wheel
  if(omniOpen) {
    drawWheel();
    
    // Draw timer countdown
    if(omniTimer > 0) {
      ctx.save();
      const cx = isMobile ? cvs.width/2 : player.x;
      const cy = isMobile ? cvs.height/2 : player.y - 100;
      const timerRadius = isMobile ? 115 : 95;
      
      ctx.strokeStyle = 'rgba(0,255,0,0.5)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, timerRadius, -Math.PI/2, -Math.PI/2 + (Math.PI*2 * (omniTimer/5000)), false);
      ctx.stroke();
      ctx.restore();
    }
  }
}

// Game will start when start button is clicked