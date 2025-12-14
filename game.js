// Game configuration
const GRID_WIDTH = 17;
const GRID_HEIGHT = 10;
const TARGET_SUM = 10;

// Game state
let grid = [];
let score = 0;
let isDragging = false;
let dragStart = null; // { x, y } in pixels
let selectedCells = new Set();
let gameMode = null; // '2min', '1min', 'infinity'
let timeRemaining = 0; // in seconds
let timerInterval = null;
let gameState = 'start'; // 'start', 'playing', 'gameOver'
let eventListenersAttached = false;

// Store handler references for proper removal
const preventContextMenuHandler = (e) => e.preventDefault();

// DOM elements - will be initialized when DOM is ready
let selectionBox;
let gridContainer;
let gameArea;
let startScreen;
let gameOverScreen;
let timerContainer;
let timerDisplay;
let restartBtn;
let backToStartBtn;

// Initialize when DOM is ready
function init() {
    selectionBox = document.getElementById('selectionBox');
    gridContainer = document.getElementById('gridContainer');
    gameArea = document.getElementById('gameArea');
    startScreen = document.getElementById('startScreen');
    gameOverScreen = document.getElementById('gameOverScreen');
    timerContainer = document.getElementById('timerContainer');
    timerDisplay = document.getElementById('timer');
    restartBtn = document.getElementById('restartBtn');
    backToStartBtn = document.getElementById('backToStartBtn');

    // Back to start button
    if (backToStartBtn) {
        backToStartBtn.addEventListener('click', () => {
            gameOverScreen.style.display = 'none';
            startScreen.style.display = 'block';
            gameArea.style.display = 'none';
            document.getElementById('instructions').style.display = 'none';
            backToStartBtn.style.display = 'none';
            gameState = 'start';
            stopTimer();
        });
    }

    // Setup mode buttons
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.dataset.mode;
            startGame(mode);
        });
    });

    // Restart button
    if (restartBtn) {
        restartBtn.addEventListener('click', () => {
            gameOverScreen.style.display = 'none';
            startScreen.style.display = 'block';
            gameArea.style.display = 'none';
            document.getElementById('instructions').style.display = 'none';
            if (backToStartBtn) {
                backToStartBtn.style.display = 'none';
            }
            gameState = 'start';
            stopTimer();
        });
    }
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Start game with selected mode
function startGame(mode) {
    gameMode = mode;
    gameState = 'playing';
    score = 0;
    
    // Hide start screen, show game area
    startScreen.style.display = 'none';
    gameArea.style.display = 'block';
    gameOverScreen.style.display = 'none';
    document.getElementById('instructions').style.display = 'block';
    if (backToStartBtn) {
        backToStartBtn.style.display = 'block';
    }
    
    // Initialize timer based on mode
    if (mode === '2min') {
        timeRemaining = 2 * 60; // 2 minutes
        timerContainer.style.display = 'flex';
        startTimer();
    } else if (mode === '1min') {
        timeRemaining = 1 * 60; // 1 minute
        timerContainer.style.display = 'flex';
        startTimer();
    } else if (mode === 'infinity') {
        timerContainer.style.display = 'none';
        timeRemaining = Infinity;
    }
    
    createGrid();
    updateScore();
    updateTimer();
    setupEventListeners();
}

// Timer functions
function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    
    timerInterval = setInterval(() => {
        if (gameState !== 'playing') return;
        
        if (timeRemaining > 0 && timeRemaining !== Infinity) {
            timeRemaining--;
            updateTimer();
            
            if (timeRemaining <= 0) {
                gameOver();
            }
        }
    }, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function addTime(seconds) {
    if (timeRemaining !== Infinity) {
        timeRemaining += seconds;
        updateTimer();
    }
}

function updateTimer() {
    if (!timerDisplay) return;
    
    if (timeRemaining === Infinity) {
        timerDisplay.textContent = '∞';
        return;
    }
    
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    timerDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    // Change color when time is running low
    if (timeRemaining <= 10) {
        timerDisplay.style.color = '#ff4444';
    } else {
        timerDisplay.style.color = '';
    }
}

// Game over
function gameOver() {
    gameState = 'gameOver';
    stopTimer();
    document.getElementById('finalScore').textContent = score;
    gameOverScreen.style.display = 'block';
}

// Create the grid
function createGrid() {
    if (!gridContainer) return;
    
    grid = [];
    gridContainer.innerHTML = '';
    
    // Create array with equal distribution of numbers 1-9
    const totalCells = GRID_WIDTH * GRID_HEIGHT; // 170 cells
    const numbersPerValue = Math.floor(totalCells / 9); // 18 of each number
    const remainder = totalCells % 9; // 8 extra cells
    
    // Create array with numbers 1-9, each appearing 'numbersPerValue' times
    let numberArray = [];
    for (let num = 1; num <= 9; num++) {
        for (let i = 0; i < numbersPerValue; i++) {
            numberArray.push(num);
        }
    }
    
    // Add remainder numbers randomly to make it exactly 170
    for (let i = 0; i < remainder; i++) {
        numberArray.push(Math.floor(Math.random() * 9) + 1);
    }
    
    // Shuffle the array
    for (let i = numberArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [numberArray[i], numberArray[j]] = [numberArray[j], numberArray[i]];
    }
    
    // Fill the grid with shuffled numbers
    let arrayIndex = 0;
    for (let row = 0; row < GRID_HEIGHT; row++) {
        grid[row] = [];
        for (let col = 0; col < GRID_WIDTH; col++) {
            const value = numberArray[arrayIndex++];
            grid[row][col] = {
                value: value,
                element: null,
                row: row,
                col: col
            };
            
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.innerHTML = '<span class="peach-emoji">🍑</span><span class="cell-value">' + value + '</span>';
            cell.dataset.row = row;
            cell.dataset.col = col;
            
            grid[row][col].element = cell;
            gridContainer.appendChild(cell);
        }
    }
}

// Setup event listeners
function setupEventListeners() {
    if (!gridContainer || !gameArea) return;
    
    // Remove old listeners by cloning grid container
    const newContainer = gridContainer.cloneNode(true);
    if (gridContainer.parentNode) {
        gridContainer.parentNode.replaceChild(newContainer, gridContainer);
        gridContainer = newContainer;
    }
    
    // Update references to cells
    for (let row = 0; row < GRID_HEIGHT; row++) {
        for (let col = 0; col < GRID_WIDTH; col++) {
            if (grid[row] && grid[row][col]) {
                const cell = gridContainer.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                if (cell) {
                    grid[row][col].element = cell;
                }
            }
        }
    }
    
    // Remove old event listeners if they exist
    if (eventListenersAttached) {
        gameArea.removeEventListener('mousedown', handleMouseDown);
        gameArea.removeEventListener('mousemove', handleMouseMove);
        gameArea.removeEventListener('mouseup', handleMouseUp);
        gameArea.removeEventListener('mouseleave', handleMouseUp);
        gameArea.removeEventListener('contextmenu', preventContextMenuHandler);
    }
    
    // Attach event listeners to game area so dragging works anywhere
    gameArea.addEventListener('mousedown', handleMouseDown);
    gameArea.addEventListener('mousemove', handleMouseMove);
    gameArea.addEventListener('mouseup', handleMouseUp);
    gameArea.addEventListener('mouseleave', handleMouseUp);
    
    // Prevent context menu on right click
    gameArea.addEventListener('contextmenu', preventContextMenuHandler);
    
    eventListenersAttached = true;
}

// Get cell position from pixel coordinates
function getCellFromPosition(x, y) {
    if (!gridContainer) return null;
    
    const rect = gridContainer.getBoundingClientRect();
    const relativeX = x - rect.left;
    const relativeY = y - rect.top;
    
    // Check if within bounds
    if (relativeX < 0 || relativeY < 0 || relativeX > rect.width || relativeY > rect.height) {
        return null;
    }
    
    // Find which cell contains this point by checking each cell's bounding box
    for (let row = 0; row < GRID_HEIGHT; row++) {
        for (let col = 0; col < GRID_WIDTH; col++) {
            if (grid[row] && grid[row][col]) {
                const cell = grid[row][col].element;
                const cellRect = cell.getBoundingClientRect();
                const cellRelativeX = cellRect.left - rect.left;
                const cellRelativeY = cellRect.top - rect.top;
                
                if (relativeX >= cellRelativeX && 
                    relativeX <= cellRelativeX + cellRect.width &&
                    relativeY >= cellRelativeY && 
                    relativeY <= cellRelativeY + cellRect.height) {
                    return { row, col };
                }
            }
        }
    }
    
    return null;
}

// Handle mouse down
function handleMouseDown(e) {
    if (gameState !== 'playing') return;
    if (e.button !== 0) return; // Only left mouse button
    if (!gameArea) return;
    
    const rect = gameArea.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    // Check if click is within game area
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
        return;
    }
    
    isDragging = true;
    dragStart = { x, y };
    
    selectedCells.clear();
    updateSelection();
    updateSelectedSum();
}

// Handle mouse move
function handleMouseMove(e) {
    if (gameState !== 'playing') return;
    if (!isDragging || !dragStart) return;
    
    const currentX = e.clientX;
    const currentY = e.clientY;
    
    // Always update selection box
    updateSelectionBox(e);
    
    // Calculate selection rectangle in screen coordinates
    const minX = Math.min(dragStart.x, currentX);
    const maxX = Math.max(dragStart.x, currentX);
    const minY = Math.min(dragStart.y, currentY);
    const maxY = Math.max(dragStart.y, currentY);
    
    // Find all cells that overlap with the selection rectangle
    selectedCells.clear();
    
    if (gridContainer) {
        const gridRect = gridContainer.getBoundingClientRect();
        
        // Check each cell to see if it overlaps with the selection box
        for (let row = 0; row < GRID_HEIGHT; row++) {
            for (let col = 0; col < GRID_WIDTH; col++) {
                if (grid[row] && grid[row][col] && !grid[row][col].element.classList.contains('empty')) {
                    const cell = grid[row][col].element;
                    const cellRect = cell.getBoundingClientRect();
                    
                    // Check if cell overlaps with selection rectangle
                    const cellLeft = cellRect.left;
                    const cellRight = cellRect.right;
                    const cellTop = cellRect.top;
                    const cellBottom = cellRect.bottom;
                    
                    // Check for overlap
                    if (!(cellRight < minX || cellLeft > maxX || cellBottom < minY || cellTop > maxY)) {
                        selectedCells.add(`${row}-${col}`);
                    }
                }
            }
        }
    }
    
    updateSelection();
    updateSelectedSum();
}

// Handle mouse up
function handleMouseUp(e) {
    if (gameState !== 'playing') return;
    if (!isDragging) return;
    
    isDragging = false;
    if (selectionBox) {
        selectionBox.style.display = 'none';
    }
    
    // Check if sum equals 10
    const sum = calculateSum();
    if (sum === TARGET_SUM) {
        removeSelectedCells();
        score += selectedCells.size;
        updateScore();
        
        // Add 5 seconds in 1 minute mode
        if (gameMode === '1min') {
            addTime(5);
        }
    }
    
    // Clear selection
    selectedCells.clear();
    updateSelection();
    updateSelectedSum();
    dragStart = null;
}

// Update visual selection
function updateSelection() {
    // Remove all selections
    document.querySelectorAll('.cell').forEach(cell => {
        cell.classList.remove('selected');
    });
    
    // Add selection to selected cells
    selectedCells.forEach(cellKey => {
        const [row, col] = cellKey.split('-').map(Number);
        if (grid[row] && grid[row][col]) {
            grid[row][col].element.classList.add('selected');
        }
    });
}

// Update selection box visual
function updateSelectionBox(e) {
    if (!isDragging || !dragStart || !gameArea || !selectionBox) return;
    
    const gameAreaRect = gameArea.getBoundingClientRect();
    const currentX = e.clientX - gameAreaRect.left;
    const currentY = e.clientY - gameAreaRect.top;
    const startX = dragStart.x - gameAreaRect.left;
    const startY = dragStart.y - gameAreaRect.top;
    
    const left = Math.min(startX, currentX);
    const top = Math.min(startY, currentY);
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);
    
    selectionBox.style.left = left + 'px';
    selectionBox.style.top = top + 'px';
    selectionBox.style.width = width + 'px';
    selectionBox.style.height = height + 'px';
    selectionBox.style.display = 'block';
}

// Calculate sum of selected cells
function calculateSum() {
    let sum = 0;
    selectedCells.forEach(cellKey => {
        const [row, col] = cellKey.split('-').map(Number);
        if (grid[row] && grid[row][col]) {
            sum += grid[row][col].value;
        }
    });
    return sum;
}

// Update selected sum display (removed - no longer displayed)
function updateSelectedSum() {
    // Function kept for compatibility but does nothing
}

// Remove selected cells
function removeSelectedCells() {
    const cellsToRemove = Array.from(selectedCells);
    
    cellsToRemove.forEach(cellKey => {
        const [row, col] = cellKey.split('-').map(Number);
        if (grid[row] && grid[row][col]) {
            const cell = grid[row][col].element;
            cell.classList.add('empty');
            cell.innerHTML = '';
            grid[row][col].value = 0; // Mark as empty
        }
    });
    
    // Cells stay empty - no respawn
}

// Update score display
function updateScore() {
    document.getElementById('score').textContent = score;
}
