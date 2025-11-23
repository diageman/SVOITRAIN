// --- STATE MANAGEMENT ---
let currentScenario = {};
let scenarioHistory = [];
let lastCorrectChoices = []; // История последних правильных ответов для разнообразия

// GAME_STATE сделан глобальным для доступа из HTML
window.GAME_STATE = {
    mode: 'menu', // 'endless', 'survival', 'menu'
    lives: 5,
    maxLives: 5,
    isActive: false,
    isProcessing: false, // Флаг для предотвращения действий во время загрузки/анимации
    performanceStreak: 0 // НОВОЕ: Отслеживает серию правильных ответов для адаптивной сложности
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
    // Иконка водителя. Добавлен mt-1 для выравнивания с бейджем статуса.
    driver: `<div class="driver-icon w-8 h-8 rounded-full bg-dark-border border-2 border-slate-600 flex items-center justify-center mr-3 flex-shrink-0 shadow-md mt-1">
    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-slate-300" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2C9.38 2 7.25 4.13 7.25 6.75c0 2.57 2.01 4.65 4.63 4.74.08-.01.16-.01.22 0h.07a4.738 4.738 0 004.58-4.74C16.75 4.13 14.62 2 12 2zM17.08 14.15c-2.79-1.86-7.34-1.86-10.15 0-1.27.85-1.97 2-1.97 3.23s.7 2.37 1.96 3.21C8.32 21.53 10.16 22 12 22c1.84 0 3.68-.47 5.08-1.41 1.26-.85 1.96-1.99 1.96-3.23-.01-1.23-.7-2.37-1.96-3.21z"/>
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
    if (!Elements.gameUI) return;

    // Скрываем игровой интерфейс
    Elements.gameUI.classList.add('hidden');
    Elements.gameUI.classList.remove('flex');

    // Показываем меню
    Elements.mainMenu.classList.remove('hidden');
    setTimeout(() => {
        Elements.mainMenu.style.opacity = '1';
    }, 10);

    Elements.feedbackArea.classList.add('hidden');
    Elements.feedbackArea.classList.remove('flex');

    GAME_STATE.isActive = false;
    GAME_STATE.isProcessing = false;
    GAME_STATE.mode = 'menu';
    GAME_STATE.performanceStreak = 0; // Сброс серии
    // Сброс бейджа в заголовке
    Elements.modeBadge.textContent = 'Меню';
    Elements.modeBadge.className = 'px-3 py-1 rounded-lg text-sm font-semibold uppercase tracking-wider border bg-dark-ui text-slate-400 border-dark-border';
    Elements.livesContainer.classList.add('hidden');
}

/**
 * УЛУЧШЕНО: Добавляет подтверждение перед выходом из активной смены.
 */
function confirmExit() {
    // Запрашиваем подтверждение, только если игра активна и не находится в процессе обработки
    if (GAME_STATE.isActive && !GAME_STATE.isProcessing) {
        if (confirm("Вы уверены, что хотите закончить смену? Прогресс будет потерян.")) {
            showMainMenu();
        }
    } else if (GAME_STATE.mode !== 'menu') {
        // Если игра не активна (например, Game Over) или в процессе загрузки, выходим сразу
        showMainMenu();
    }
}

function startGame(mode) {
    if (GAME_STATE.isProcessing) return;

     // Проверка наличия сценариев перед стартом
     if (typeof BASE_SCENARIOS === 'undefined' || !Array.isArray(BASE_SCENARIOS) || BASE_SCENARIOS.length === 0) {
        alert("Ошибка: Сценарии не загружены. Невозможно начать игру. Проверьте файл scenarios.js");
        return;
    }

    GAME_STATE.mode = mode;
    GAME_STATE.isActive = true;
    scenarioHistory = [];
    lastCorrectChoices = [];
    GAME_STATE.performanceStreak = 0;
    GAME_STATE.isProcessing = true;

    // Плавное скрытие меню
    Elements.mainMenu.style.opacity = '0';
    setTimeout(() => {
        Elements.mainMenu.classList.add('hidden');
        // Показываем игровой интерфейс
        Elements.gameUI.classList.remove('hidden');
        Elements.gameUI.classList.add('flex');

        setupUIMode(mode);
        loadNextScenario();
    }, 500);
}

function setupUIMode(mode) {
    // Настройка UI в зависимости от режима
    Elements.modeBadge.className = 'px-3 py-1 rounded-lg text-sm font-semibold uppercase tracking-wider border';

    // Сброс кнопок
    Elements.nextBtn.classList.remove('hidden');
    Elements.restartBtn.classList.add('hidden');
    Elements.menuBtn.classList.add('hidden');

    if (mode === 'endless') {
        Elements.modeBadge.textContent = 'Свободная смена';
        Elements.modeBadge.classList.add('bg-dark-ui', 'text-slate-300', 'border-dark-border');
        Elements.livesContainer.classList.add('hidden');
    } else if (mode === 'survival') {
        Elements.modeBadge.textContent = 'Час пик'; // Используем название "Час пик"
        Elements.modeBadge.classList.add('bg-purple-900/50', 'text-purple-300', 'border-purple-700');
        GAME_STATE.maxLives = 5;
        GAME_STATE.lives = GAME_STATE.maxLives;
        Elements.livesContainer.classList.remove('hidden');
        updateLivesDisplay();
    }
}

/**
 * Обновляет визуальное отображение жизней (рейтинга).
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
 * УЛУЧШЕНО: Отображает сообщение в окне чата с улучшенной визуализацией статуса.
 */
function displayMessage(from, text, status = null, driverName = null) {
    const messageElement = document.createElement('div');
    // Добавляем items-start для выравнивания иконки по верху блока сообщения
    messageElement.classList.add('flex', 'mb-4', 'animate-fade-in', 'items-start');

    const textElement = document.createElement('div');
    textElement.classList.add('chat-bubble', 'p-3', 'rounded-2xl', 'max-w-lg', 'shadow-lg', 'text-sm', 'break-words');

    // --- Стилизация и контент в зависимости от отправителя ---

    if (from === 'driver') {
        // Стили пузыря водителя (Темный UI)
        textElement.classList.add('bg-dark-ui', 'text-slate-100', 'border', 'border-dark-border');

        // Добавление имени водителя
        if (driverName) {
            const nameSpan = document.createElement('span');
            nameSpan.classList.add('font-bold', 'text-accent-yellow');
            nameSpan.textContent = driverName + ': ';
            textElement.appendChild(nameSpan);
        }
        const textSpan = document.createElement('span');
        textSpan.textContent = text;
        textElement.appendChild(textSpan);

        // Иконка водителя слева
        messageElement.innerHTML = ICONS.driver;

        // Обёртка для бейджа (статуса) и текста
        const contentWrapper = document.createElement('div');
        contentWrapper.classList.add('flex', 'flex-col', 'items-start');

        // Статус (Бейдж) отображается над сообщением
        if (status) {
            const badge = document.createElement('span');
            // Делаем бейдж более заметным и стилизованным
            badge.className = 'text-xs font-semibold mb-2 px-2 py-0.5 rounded-full shadow-md';

            if (status === 'active') {
                badge.textContent = '✅ Действующий';
                badge.classList.add('text-green-300', 'bg-green-900/70');
            } else {
                badge.textContent = '❌ Не зарегистрирован';
                badge.classList.add('text-red-300', 'bg-red-900/70');
            }
            contentWrapper.appendChild(badge);
        }

        contentWrapper.appendChild(textElement);
        messageElement.appendChild(contentWrapper);

    } else if (from === 'support') {
        // Сообщение пользователя (поддержки) справа
        messageElement.classList.add('justify-end');
        // Используем accent-cyan для консистентности
        textElement.classList.add('bg-accent-cyan', 'text-gray-900', 'font-medium');
        textElement.textContent = text;
        messageElement.appendChild(textElement);
        messageElement.innerHTML += ICONS.support;

    } else if (from === 'system') {
        // Системные сообщения центрированы
        messageElement.classList.add('justify-center', 'w-full');
        textElement.classList.add('bg-slate-800/50', 'text-xs', 'text-slate-400', 'font-semibold', 'uppercase', 'tracking-wider', 'p-2', 'rounded-lg', 'shadow-none', 'border', 'border-dashed', 'border-slate-700');
        textElement.textContent = text;
        messageElement.appendChild(textElement);
    }

    Elements.chatWindow.appendChild(messageElement);
}

// --- НОВЫЕ ФУНКЦИИ: Движок Динамических Правил ---

/**
 * НОВОЕ: Предсказывает правильный выбор для сценария, оценивая его dynamicRules.
 * Используется для умной рандомизации до начала сценария.
 */
function predictScenarioChoice(scenario) {
    let predictedChoice = scenario.correctChoice;

    // Проверяем наличие массива dynamicRules в сценарии
    if (scenario.dynamicRules && Array.isArray(scenario.dynamicRules)) {
        for (const rule of scenario.dynamicRules) {
            try {
                let conditionMet = false;

                // Условие на основе функции (для сложной логики, определенной в scenarios.js)
                if (typeof rule.condition === 'function') {
                    if (rule.condition(scenario)) {
                        conditionMet = true;
                    }
                }
                // Условие на основе объекта (простое сопоставление ключ-значение)
                else if (typeof rule.condition === 'object' && rule.condition !== null) {
                    // Проверяем, что все ключи в условии совпадают со свойствами сценария
                    const matches = Object.keys(rule.condition).every(key => scenario[key] === rule.condition[key]);
                    if (matches) {
                        conditionMet = true;
                    }
                }

                if (conditionMet) {
                    predictedChoice = rule.overrideChoice;
                    break; // Останавливаемся после первого совпавшего правила
                }

            } catch (error) {
                console.error(`Error predicting choice for scenario ${scenario.id}:`, error);
            }
        }
    }
    return predictedChoice;
}

/**
 * НОВОЕ: Оценивает результат выбора для данного сценария с учетом dynamicRules.
 */
function evaluateScenarioOutcome(scenario, choice) {
    let expectedChoice = scenario.correctChoice;
    let feedback = scenario.feedback;

    // 1. Проверяем динамические правила (используя ту же логику, что и в predictScenarioChoice)
    if (scenario.dynamicRules && Array.isArray(scenario.dynamicRules)) {
        for (const rule of scenario.dynamicRules) {
            try {
                let conditionMet = false;
                if (typeof rule.condition === 'function' && rule.condition(scenario)) {
                    conditionMet = true;
                } else if (typeof rule.condition === 'object' && rule.condition !== null) {
                    const matches = Object.keys(rule.condition).every(key => scenario[key] === rule.condition[key]);
                    if (matches) {
                        conditionMet = true;
                    }
                }

                if (conditionMet) {
                    expectedChoice = rule.overrideChoice;
                    // Используем переопределенную обратную связь, если она есть
                    feedback = rule.overrideFeedback || feedback;
                    break; // Останавливаемся после первого совпадения
                }

            } catch (error) {
                console.error(`Error evaluating dynamic rule for scenario ${scenario.id}:`, error);
            }
        }
    }

    // 2. Определяем правильность
    const isCorrect = (choice === expectedChoice);

    return { isCorrect, feedback, expectedChoice };
}


/**
 * УЛУЧШЕНО: Загружает новый сценарий с Адаптивной сложностью и Умной рандомизацией.
 */
async function loadNextScenario() {
    if (!GAME_STATE.isActive) {
        GAME_STATE.isProcessing = false;
        return;
    }

    GAME_STATE.isProcessing = true;

    // Сброс UI
    Elements.chatWindow.innerHTML = '';
    Elements.chatWindow.classList.add('opacity-50');
    Elements.feedbackArea.classList.add('hidden');
    Elements.feedbackArea.classList.remove('flex');
    Elements.actionButtonsDiv.classList.add('hidden');
    Elements.actionButtonsDiv.classList.remove('grid');

    // Базовая проверка наличия сценариев
    if (BASE_SCENARIOS.length === 0) return;

    let availableScenarios = BASE_SCENARIOS.filter(s => !scenarioHistory.includes(s.id));

    // Если все сценарии использованы, сбрасываем историю
    if (availableScenarios.length === 0) {
        if (scenarioHistory.length > 0) {
            displayMessage('system', 'Все сценарии пройдены. Начинаем заново.');
            await delay(1500);
            Elements.chatWindow.innerHTML = '';
        }
        scenarioHistory = [];
        lastCorrectChoices = [];
        GAME_STATE.performanceStreak = 0; // Сбрасываем серию при обновлении пула сценариев
        availableScenarios = [...BASE_SCENARIOS];
    }

    // --- ЛОГИКА АДАПТИВНОЙ СЛОЖНОСТИ ---
    let targetDifficulty = 1; // По умолчанию (Easy)

    // Определение целевой сложности на основе серии правильных ответов
    if (GAME_STATE.performanceStreak >= 5) {
        targetDifficulty = 3; // Hard (5 правильных подряд)
    } else if (GAME_STATE.performanceStreak >= 2) {
        targetDifficulty = 2; // Medium (2 правильных подряд)
    }

    // Фильтруем сценарии по целевой сложности (если difficulty не указано, считаем его 1)
    let difficultyFilteredScenarios = availableScenarios.filter(s => (s.difficulty || 1) === targetDifficulty);

    // Интеллектуальный откат (Fallback), если нет сценариев нужной сложности
    if (difficultyFilteredScenarios.length === 0) {
        // Пытаемся найти сценарии близкие по сложности
        if (targetDifficulty === 3) {
            // Если нет Hard, ищем Medium, затем Easy
            difficultyFilteredScenarios = availableScenarios.filter(s => (s.difficulty || 1) === 2);
            if (difficultyFilteredScenarios.length === 0) {
                difficultyFilteredScenarios = availableScenarios.filter(s => (s.difficulty || 1) === 1);
            }
        }
        else if (targetDifficulty === 2) {
             // Если нет Medium, в первую очередь ищем Hard, затем Easy
             difficultyFilteredScenarios = availableScenarios.filter(s => (s.difficulty || 1) === 3);
             if (difficultyFilteredScenarios.length === 0) {
                difficultyFilteredScenarios = availableScenarios.filter(s => (s.difficulty || 1) === 1);
            }
        }
        // Если после всех попыток ничего не найдено, используем то, что осталось.
        if (difficultyFilteredScenarios.length === 0) {
            difficultyFilteredScenarios = availableScenarios;
        }
    }


    // --- УМНАЯ РАНДОМИЗАЦИЯ (Применяется к отфильтрованному по сложности списку) ---
    let preferredScenarios = difficultyFilteredScenarios;

    // Пытаемся избежать повторения последних 2 ответов
    if (lastCorrectChoices.length >= 2) {
        const recentChoices = lastCorrectChoices.slice(-2);

        // Используем predictScenarioChoice для учета динамических правил при фильтрации!
        preferredScenarios = difficultyFilteredScenarios.filter(s => {
            const predictedChoice = predictScenarioChoice(s);
            return !recentChoices.includes(predictedChoice);
        });

        // Если после фильтрации ничего не осталось, используем полный список (отфильтрованный по сложности)
        if (preferredScenarios.length === 0) {
            preferredScenarios = difficultyFilteredScenarios;
        }
    }

    // Выбор сценария
    currentScenario = preferredScenarios[Math.floor(Math.random() * preferredScenarios.length)];
    scenarioHistory.push(currentScenario.id);

    // Обновляем историю правильных ответов, используя предсказание
    const finalExpectedChoice = predictScenarioChoice(currentScenario);
    lastCorrectChoices.push(finalExpectedChoice);

    // Ограничиваем длину истории
    if (lastCorrectChoices.length > 5) {
        lastCorrectChoices.shift();
    }

    Elements.chatWindow.classList.remove('opacity-50'); // Восстанавливаем яркость

    // Отображение сообщений с симуляцией задержки печати
    for (const message of currentScenario.chat) {
        if (!GAME_STATE.isActive) break; // Stop if game exited
        if (!message.text) continue;

        // Показываем индикатор печати...
        if (message.from !== 'system') {
            Elements.typingIndicator.classList.remove('hidden');
            scrollToBottom();
            await delay(500 + Math.min(message.text.length * 25, 2000));
            Elements.typingIndicator.classList.add('hidden');
        }

        if (!GAME_STATE.isActive) break;

        displayMessage(
            message.from,
            message.text,
            (message.from === 'driver' ? currentScenario.status : null),
            (message.from === 'driver' ? currentScenario.driverName : null)
        );
        scrollToBottom();

        await delay(300);
    }

    // Показываем кнопки действий
    if (GAME_STATE.isActive) {
        Elements.actionButtonsDiv.classList.remove('hidden');
        Elements.actionButtonsDiv.classList.add('grid');
        scrollToBottom();
    }

    GAME_STATE.isProcessing = false;
}

/**
 * УЛУЧШЕНО: Обрабатывает выбор пользователя, используя систему оценки динамических правил.
 */
async function handleChoice(choice) {
    if (GAME_STATE.isProcessing || !GAME_STATE.isActive) return;

    GAME_STATE.isProcessing = true;

    // Скрываем кнопки действий
    Elements.actionButtonsDiv.classList.add('hidden');
    Elements.actionButtonsDiv.classList.remove('grid');

    // Отображаем выбор пользователя
    const choiceTextMap = {
        'handle': '🔧 Обрабатываю запрос (Техподдержка/Финансы)',
        'distributor': '➡️ Перенаправляю (Распределятор)',
        'leader': '⬆️ Эскалирую руководителю',
        'deal_negative': '⚠️ Передаю в отдел Сделок (Негатив/Риск)'
    };
    displayMessage('support', choiceTextMap[choice] || 'Выбрано действие...');
    scrollToBottom();

    await delay(1200);

    // Используем функцию оценки для определения результата (с учетом динамических правил)
    const { isCorrect, feedback } = evaluateScenarioOutcome(currentScenario, choice);

    let isGameOver = false;
    let feedbackMessage = feedback;

    // Настройка UI обратной связи
    Elements.feedbackCard.className = 'max-w-md w-full bg-dark-ui p-8 rounded-3xl shadow-2xl border-4';

    if (isCorrect) {
        Elements.feedbackIcon.textContent = '✅';
        Elements.feedbackTitle.textContent = 'Отлично!';
        Elements.feedbackCard.classList.add('border-green-500');
        GAME_STATE.performanceStreak++; // Увеличиваем серию правильных ответов
    } else {
        Elements.feedbackIcon.textContent = '❌';
        Elements.feedbackTitle.textContent = 'Неправильно';
        Elements.feedbackCard.classList.add('border-red-500');
        GAME_STATE.performanceStreak = 0; // Сбрасываем серию при ошибке

        // Логика режима выживания
        if (GAME_STATE.mode === 'survival') {
            GAME_STATE.lives--;
            updateLivesDisplay();

            // Добавляем анимацию встряхивания
            Elements.livesContainer.classList.add('shake-animation');
            Elements.livesContainer.addEventListener('animationend', () => {
                Elements.livesContainer.classList.remove('shake-animation');
            }, { once: true });


            if (GAME_STATE.lives <= 0) {
                isGameOver = true;
                Elements.feedbackTitle.textContent = 'Конец смены!';
                feedbackMessage += '\n\n📉 Ваш рейтинг упал до критического уровня. Попробуйте еще раз.';
            } else {
                feedbackMessage += `\n\n⚠️ Рейтинг снижен. Осталось звезд: ${GAME_STATE.lives}`;
            }
        }
    }

    // Настройка видимости кнопок
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