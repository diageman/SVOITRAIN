// --- STATE MANAGEMENT ---
let currentScenario = {};
let scenarioHistory = [];
// GAME_STATE сделан глобальным для доступа из HTML
window.GAME_STATE = {
    mode: 'menu', // 'endless', 'survival', 'menu'
    lives: 5,
    maxLives: 5,
    isActive: false,
    isProcessing: false // Флаг для предотвращения действий во время загрузки/анимации
};

// --- DOM ELEMENTS (Consolidated) ---
const Elements = {};

// Инициализация элементов после загрузки DOM для надежности
function initializeElements() {
    Elements.mainMenu = document.getElementById('main-menu');
    Elements.monitorScreen = document.getElementById('monitor-screen');
    Elements.gameUI = document.getElementById('game-ui');
    Elements.chatWindow = document.getElementById('chat-window');
    Elements.actionButtonsDiv = document.getElementById('action-buttons');
    Elements.feedbackArea = document.getElementById('feedback-area');
    Elements.feedbackCard = document.getElementById('feedback-card');
    Elements.feedbackTitle = document.getElementById('feedback-title');
    Elements.feedbackText = document.getElementById('feedback-text');
    Elements.feedbackIcon = document.getElementById('feedback-icon');
    Elements.modeBadge = document.getElementById('mode-badge');
    Elements.livesContainer = document.getElementById('lives-container');
    Elements.heartsDiv = document.getElementById('hearts');
    Elements.nextBtn = document.getElementById('next-btn');
    Elements.restartBtn = document.getElementById('restart-btn');
    Elements.menuBtn = document.getElementById('menu-btn');
    Elements.typingIndicator = document.getElementById('typing-indicator');
}

// Запуск инициализации после загрузки страницы
document.addEventListener('DOMContentLoaded', initializeElements);


// --- UTILITY FUNCTIONS ---

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

function scrollToBottom() {
    if (Elements.chatWindow) {
        Elements.chatWindow.scrollTop = Elements.chatWindow.scrollHeight;
    }
}

// Кэшируем SVG иконок для производительности
const ICONS = {
    // Иконка водителя (Руль) - сохраняем оригинальный дизайн
    driver: `<div class="driver-icon w-8 h-8 rounded-full bg-dark-border border-2 border-slate-600 flex items-center justify-center mr-3 flex-shrink-0 shadow-md">
    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
    </svg>
</div>`,
    // Иконка поддержки (Чат) - Представляет пользователя
    support: `<div class="w-8 h-8 rounded-full bg-accent-cyan border-2 border-cyan-500 text-gray-900 flex items-center justify-center ml-3 flex-shrink-0 font-bold shadow-md">
    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
    </svg>
</div>`
};

// --- GAME LOGIC ---

/**
 * Показывает главное меню и сбрасывает состояние игры.
 */
function showMainMenu() {
    // Убедимся, что элементы загружены (на случай вызова до DOMContentLoaded)
    if (!Elements.gameUI) return;

    // Скрываем игровой интерфейс
    Elements.gameUI.classList.add('hidden');
    Elements.gameUI.classList.remove('flex'); // Убедимся, что flex удален

    // Показываем меню
    Elements.mainMenu.classList.remove('hidden');
    // Небольшая задержка для плавности анимации opacity
    setTimeout(() => {
        Elements.mainMenu.style.opacity = '1';
    }, 10);


    Elements.feedbackArea.classList.add('hidden');
    Elements.feedbackArea.classList.remove('flex');

    GAME_STATE.isActive = false;
    GAME_STATE.isProcessing = false;
    GAME_STATE.mode = 'menu';
    // Сброс бейджа в заголовке
    Elements.modeBadge.textContent = 'Меню';
    Elements.modeBadge.className = 'px-3 py-1 rounded-lg text-sm font-semibold uppercase tracking-wider border bg-dark-ui text-slate-400 border-dark-border';
    Elements.livesContainer.classList.add('hidden');
}

/**
 * Добавляет подтверждение перед выходом из активной смены.
 */
function confirmExit() {
    console.log('confirmExit called. State:', GAME_STATE);
    // Разрешаем выход даже если идет обработка (isProcessing), чтобы пользователь не застрял
    if (GAME_STATE.isActive) {
        console.log('Game active. Requesting confirmation.');
        if (confirm("Вы уверены, что хотите закончить смену? Прогресс будет потерян.")) {
            console.log('User confirmed exit.');
            showMainMenu();
        } else {
            console.log('User cancelled exit.');
        }
    } else if (GAME_STATE.mode !== 'menu') {
        console.log('Game not active or processing, but mode is not menu. Forcing exit.');
        showMainMenu();
    } else {
        console.log('Exit condition not met.');
    }
}

function startGame(mode) {
    if (GAME_STATE.isProcessing) return;

    GAME_STATE.mode = mode;
    GAME_STATE.isActive = true;
    scenarioHistory = [];
    GAME_STATE.isProcessing = true; // Ставим флаг обработки на время перехода

    // Плавное скрытие меню
    Elements.mainMenu.style.opacity = '0';
    setTimeout(() => {
        Elements.mainMenu.classList.add('hidden');
        // Показываем игровой интерфейс
        Elements.gameUI.classList.remove('hidden');
        Elements.gameUI.classList.add('flex');

        setupUIMode(mode);
        loadNextScenario();
        // GAME_STATE.isProcessing сбрасывается в конце loadNextScenario
    }, 500);
}

function setupUIMode(mode) {
    // Настройка UI в зависимости от режима
    Elements.modeBadge.className = 'px-3 py-1 rounded-lg text-sm font-semibold uppercase tracking-wider border';

    // Сброс кнопок (на случай перезапуска после Game Over)
    Elements.nextBtn.classList.remove('hidden');
    Elements.restartBtn.classList.add('hidden');
    Elements.menuBtn.classList.add('hidden');

    if (mode === 'endless') {
        Elements.modeBadge.textContent = 'Свободная смена';
        Elements.modeBadge.classList.add('bg-dark-ui', 'text-slate-300', 'border-dark-border');
        Elements.livesContainer.classList.add('hidden');
    } else if (mode === 'survival') {
        Elements.modeBadge.textContent = 'Ограниченные попытки';
        // Используем Purple для режима "Час пик"
        Elements.modeBadge.classList.add('bg-purple-900/50', 'text-purple-300', 'border-purple-700');
        GAME_STATE.maxLives = 5;
        GAME_STATE.lives = GAME_STATE.maxLives;
        Elements.livesContainer.classList.remove('hidden');
        updateLivesDisplay();
    }
}

/**
 * Обновляет визуальное отображение жизней (рейтинга).
 * Оптимизация: используем DocumentFragment для минимизации перерисовок DOM.
 */
function updateLivesDisplay() {
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < GAME_STATE.maxLives; i++) {
        const star = document.createElement('span');
        if (i < GAME_STATE.lives) {
            // Яркая желтая звезда
            star.className = 'text-accent-yellow drop-shadow-md';
            star.textContent = '★';
        } else {
            // Тусклая звезда
            star.className = 'text-slate-700 opacity-50';
            star.textContent = '★';
        }
        fragment.appendChild(star);
    }
    Elements.heartsDiv.innerHTML = '';
    Elements.heartsDiv.appendChild(fragment);
}

/**
 * Отображает сообщение в окне чата с соответствующим стилем.
 */
function displayMessage(from, text) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('flex', 'mb-4', 'animate-fade-in');

    const textElement = document.createElement('div');
    textElement.classList.add('chat-bubble', 'p-3', 'rounded-2xl', 'max-w-lg', 'shadow-lg', 'text-sm', 'break-words');
    textElement.textContent = text;

    // --- Стилизация в зависимости от отправителя ---

    if (from === 'driver') {
        messageElement.classList.add('justify-start');
        messageElement.innerHTML = ICONS.driver;
        // Темный пузырь для водителя
        textElement.classList.add('bg-dark-ui', 'text-slate-100', 'rounded-tl-sm', 'border', 'border-dark-border');
        messageElement.appendChild(textElement);
    } else if (from === 'support') {
        // Используется, чтобы показать выбор пользователя в чате
        messageElement.classList.add('justify-end');
        // Акцентный цвет пузыря для поддержки (пользователя)
        textElement.classList.add('bg-accent-cyan', 'text-gray-900', 'font-medium', 'rounded-tr-sm');
        messageElement.appendChild(textElement);
        messageElement.innerHTML += ICONS.support;
    } else if (from === 'system') {
        // Системные сообщения центрированы
        messageElement.classList.add('justify-center', 'w-full');
        textElement.classList.add('bg-slate-800/50', 'text-xs', 'text-slate-400', 'font-semibold', 'uppercase', 'tracking-wider', 'p-2', 'rounded-lg', 'shadow-none', 'border', 'border-dashed', 'border-slate-700');
        messageElement.appendChild(textElement);
    }

    Elements.chatWindow.appendChild(messageElement);
}

/**
 * Загружает новый сценарий и запускает асинхронное отображение сообщений.
 */
async function loadNextScenario() {
    // Убедимся, что игра активна (могла закончиться после последнего сценария)
    if (!GAME_STATE.isActive) {
        GAME_STATE.isProcessing = false;
        return;
    }

    GAME_STATE.isProcessing = true;

    // Сброс UI
    Elements.chatWindow.innerHTML = '';
    Elements.chatWindow.classList.add('opacity-50'); // Затемняем во время загрузки
    Elements.feedbackArea.classList.add('hidden');
    Elements.feedbackArea.classList.remove('flex');
    Elements.actionButtonsDiv.classList.add('hidden');
    Elements.actionButtonsDiv.classList.remove('grid');

    // Логика выбора сценария (Использует BASE_SCENARIOS из scenarios.js)
    // Проверка на случай, если scenarios.js не загрузился или пуст
    if (typeof BASE_SCENARIOS === 'undefined' || !Array.isArray(BASE_SCENARIOS) || BASE_SCENARIOS.length === 0) {
        console.error("BASE_SCENARIOS is not defined or empty. Check if scenarios.js is loaded.");
        displayMessage('system', 'Ошибка загрузки сценариев. Проверьте файл scenarios.js');
        GAME_STATE.isProcessing = false;
        Elements.chatWindow.classList.remove('opacity-50');
        return;
    }

    let availableScenarios = BASE_SCENARIOS.filter(s => !scenarioHistory.includes(s.id));

    // Если все сценарии использованы, сбрасываем историю
    if (availableScenarios.length === 0) {
        // Добавляем системное сообщение о сбросе
        if (scenarioHistory.length > 0) {
            displayMessage('system', 'Все сценарии пройдены. Начинаем заново.');
            await delay(1500);
            Elements.chatWindow.innerHTML = ''; // Очищаем чат после сообщения
        }
        scenarioHistory = [];
        availableScenarios = [...BASE_SCENARIOS];
    }

    currentScenario = availableScenarios[Math.floor(Math.random() * availableScenarios.length)];
    scenarioHistory.push(currentScenario.id);

    Elements.chatWindow.classList.remove('opacity-50'); // Восстанавливаем яркость

    // Отображение сообщений с симуляцией задержки печати
    for (const message of currentScenario.chat) {
        if (!GAME_STATE.isActive) break; // Stop if game exited
        if (!message.text) continue;

        // Показываем индикатор печати, если сообщение не системное
        if (message.from !== 'system') {
            Elements.typingIndicator.classList.remove('hidden');
            scrollToBottom();
            // Симуляция времени печати на основе длины сообщения
            await delay(500 + Math.min(message.text.length * 25, 2000));
            Elements.typingIndicator.classList.add('hidden');
        }

        if (!GAME_STATE.isActive) break; // Check again after delay

        displayMessage(message.from, message.text);
        scrollToBottom();

        // Небольшая задержка между сообщениями
        await delay(300);
    }

    // Показываем кнопки действий после отображения всех сообщений
    Elements.actionButtonsDiv.classList.remove('hidden');
    Elements.actionButtonsDiv.classList.add('grid');
    scrollToBottom();

    GAME_STATE.isProcessing = false;
}

/**
 * Обрабатывает выбор пользователя и предоставляет обратную связь.
 */
async function handleChoice(choice) {
    if (GAME_STATE.isProcessing || !GAME_STATE.isActive) return;

    GAME_STATE.isProcessing = true;

    // Скрываем кнопки действий
    Elements.actionButtonsDiv.classList.add('hidden');
    Elements.actionButtonsDiv.classList.remove('grid');

    // Отображаем выбор пользователя как сообщение от поддержки
    const choiceTextMap = {
        'handle': '🔧 Обрабатываю запрос (Техподдержка/Финансы)',
        'distributor': '➡️ Перенаправляю (Распределятор)',
        'leader': '⬆️ Эскалирую руководителю',
        'deal_negative': '⚠️ Передаю в отдел Сделок (Негатив/Риск)'
    };
    displayMessage('support', choiceTextMap[choice] || 'Выбрано действие...');
    scrollToBottom();

    // Небольшая задержка перед показом результата
    await delay(1200);

    const isCorrect = (choice === currentScenario.correctChoice);
    let isGameOver = false;

    let feedbackMessage = currentScenario.feedback;

    // Настройка UI обратной связи
    // Сброс классов границ
    Elements.feedbackCard.className = 'max-w-md w-full bg-dark-ui p-8 rounded-3xl shadow-2xl border-4';

    if (isCorrect) {
        Elements.feedbackIcon.textContent = '✅';
        Elements.feedbackTitle.textContent = 'Отлично!';
        Elements.feedbackCard.classList.add('border-green-500');
    } else {
        Elements.feedbackIcon.textContent = '❌';
        Elements.feedbackTitle.textContent = 'Неправильно';
        Elements.feedbackCard.classList.add('border-red-500');

        // Логика режима выживания
        if (GAME_STATE.mode === 'survival') {
            GAME_STATE.lives--;
            updateLivesDisplay();

            // Добавляем анимацию встряхивания
            Elements.livesContainer.classList.add('shake-animation');
            // Надежно убираем анимацию после её завершения с помощью 'animationend'
            Elements.livesContainer.addEventListener('animationend', () => {
                Elements.livesContainer.classList.remove('shake-animation');
            }, { once: true });


            if (GAME_STATE.lives <= 0) {
                isGameOver = true;
                Elements.feedbackTitle.textContent = 'Смена провалена!';
                feedbackMessage += '\n\n📉 Ваш рейтинг упал до критического уровня. Вы отстранены от работы.';
            } else {
                feedbackMessage += `\n\n⚠️ Рейтинг снижен. Осталось звезд: ${GAME_STATE.lives}`;
            }
        }
    }

    // Настройка видимости кнопок в зависимости от Game Over
    Elements.nextBtn.classList.toggle('hidden', isGameOver);
    Elements.restartBtn.classList.toggle('hidden', !isGameOver);
    Elements.menuBtn.classList.toggle('hidden', !isGameOver);

    Elements.feedbackText.textContent = feedbackMessage;

    // Показываем область обратной связи
    Elements.feedbackArea.classList.remove('hidden');
    Elements.feedbackArea.classList.add('flex');

    if (isGameOver) {
        GAME_STATE.isActive = false;
    }
    GAME_STATE.isProcessing = false;
}

// Делаем функции глобально доступными для атрибутов onclick в HTML
window.showMainMenu = showMainMenu;
window.confirmExit = confirmExit;
window.startGame = startGame;
window.loadNextScenario = loadNextScenario;
window.handleChoice = handleChoice;