// SpeakUp - Sistema de Exercícios de Fixação
// Baseado no método de repetição espaçada (Kumon/Duolingo)

let currentDay = '';
let currentExercises = [];
let userAnswers = {};
let originalMenuHTML = ''; // Armazenar HTML original do menu
let currentLevel = ''; // Nível atual (seed ou root)
let turmasCodes = {}; // Códigos das turmas
let currentActivityLabel = '';
let currentWorksheetId = '';

// URL da API - VOCÊ DEVE SUBSTITUIR PELA SUA API
const API_URL = 'https://script.google.com/macros/s/AKfycbzaWH3Z7zyfSTVtyTlNKmJvCCNMWTpD379nQ2EJ6hEef8elI1HWr9jOjjufJ-_x_ibE/exec';

// Mapeamento de nomes dos dias
const dayNames = {
    'monday': 'Segunda-feira',
    'tuesday': 'Terça-feira',
    'wednesday': 'Quarta-feira',
    'thursday': 'Quinta-feira',
    'friday': 'Sexta-feira'
};

const exerciseFilesByLevel = {
    seed: 'exercises-seed.json',
    root: 'exercises-root.json',
    leaf: 'exercises-leaf.json',
    fruit: 'exercises-fruit.json'
};

const testFilesByLevel = {
    seed: {
        file: 'test-seed.json',
        key: 'monday',
        label: 'Seed Test'
    },
    root: {
        file: 'test-root.json',
        key: 'monday',
        label: 'Root Test'
    }
};

// Carregar códigos das turmas
async function loadTurmasCodes() {
    try {
        const paths = ['./turmas.json', 'turmas.json', '/speedup/turmas.json'];
        
        for (const path of paths) {
            try {
                const response = await fetch(path);
                if (response.ok) {
                    turmasCodes = await response.json();
                    console.log('✅ Códigos das turmas carregados:', Object.keys(turmasCodes));
                    return turmasCodes;
                }
            } catch (e) {
                continue;
            }
        }
        
        console.error('❌ Não foi possível carregar turmas.json');
        return null;
    } catch (error) {
        console.error('Erro ao carregar códigos:', error);
        return null;
    }
}

// Selecionar nível (Seed ou Root)
async function selectLevel(level) {
    console.log(`🎯 Nível selecionado: ${level}`);
    
    // Carregar códigos se ainda não carregou
    if (Object.keys(turmasCodes).length === 0) {
        await loadTurmasCodes();
    }
    
    // Verificar se o nível existe
    if (!turmasCodes[level]) {
        alert('❌ Nível não encontrado!');
        return;
    }
    
    // Solicitar código da turma
    const codigo = prompt(`🔐 Digite o código da turma ${level.toUpperCase()}:`);
    
    if (!codigo) {
        return; // Usuário cancelou
    }
    
    // Validar código
    if (codigo.toLowerCase().trim() !== turmasCodes[level].code) {
        alert('❌ Código incorreto! Tente novamente.');
        return;
    }
    
    // Código correto! Avançar para menu
    currentLevel = level;
    console.log(`✅ Acesso autorizado ao nível: ${turmasCodes[level].name}`);
    
    // Atualizar título do header
    const headerSubtitle = document.querySelector('header p');
    if (headerSubtitle) {
        headerSubtitle.textContent = `${turmasCodes[level].name}: ${turmasCodes[level].description}`;
    }
    
    // Esconder tela de nível e mostrar menu
    const levelScreen = document.getElementById('level-screen');
    const menuScreen = document.getElementById('menu-screen');
    
    if (levelScreen) {
        levelScreen.style.display = 'none';
        levelScreen.classList.add('hidden');
    }
    
    if (menuScreen) {
        menuScreen.style.display = 'block';
        menuScreen.classList.remove('hidden');
        
        // Salvar HTML original do menu
        if (!originalMenuHTML) {
            originalMenuHTML = menuScreen.innerHTML;
        }
    }
}

// Carregar exercícios do JSON
async function loadExercisesFromFile(exerciseFile) {
    try {
        // Tentar diferentes caminhos para compatibilidade com GitHub Pages
        const paths = [
            `./${exerciseFile}`,
            exerciseFile,
            `/speedup/${exerciseFile}`
        ];
        
        let data = null;
        let lastError = null;
        
        for (const path of paths) {
            try {
                const response = await fetch(path);
                if (response.ok) {
                    data = await response.json();
                    console.log('Exercícios carregados de:', path);
                    return data;
                }
            } catch (error) {
                lastError = error;
                continue;
            }
        }
        
        throw lastError || new Error('Arquivo exercises.json não encontrado');
    } catch (error) {
        console.error('Erro ao carregar exercícios:', error);
        alert('❌ Erro ao carregar exercícios!\n\nVerifique se o arquivo exercises.json está na mesma pasta.\n\nErro: ' + error.message);
        return null;
    }
}

async function loadExercises() {
    const exerciseFile = exerciseFilesByLevel[currentLevel] || exerciseFilesByLevel.seed;
    return loadExercisesFromFile(exerciseFile);
}

async function loadExerciseSet(options) {
    const { dataFile, entryKey, activityLabel, worksheetId } = options;
    console.log(`🔵 loadExerciseSet('${entryKey}') chamado`);
    
    const menuScreen = document.getElementById('menu-screen');
    const exerciseScreen = document.getElementById('exercise-screen');
    
    if (!menuScreen || !exerciseScreen) {
        console.warn('⚠️ Elementos de interface não encontrados. Carregando apenas dados...');
    }
    
    if (menuScreen && !originalMenuHTML) {
        originalMenuHTML = menuScreen.innerHTML;
        console.log('💾 HTML original do menu salvo');
    }
    
    if (menuScreen) {
        menuScreen.innerHTML = `
            <div style="text-align: center; padding: 60px 20px;">
                <div style="font-size: 3em; margin-bottom: 20px;">⏳</div>
                <h2 style="color: #333;">Carregando exercícios...</h2>
                <p style="color: #666;">Por favor, aguarde</p>
            </div>
        `;
    }

    currentDay = entryKey;
    currentActivityLabel = activityLabel;
    currentWorksheetId = worksheetId;

    const allExercises = await loadExercisesFromFile(dataFile);
    
    if (!allExercises) {
        if (menuScreen && originalMenuHTML) menuScreen.innerHTML = originalMenuHTML;
        return;
    }
    
    if (!allExercises[entryKey]) {
        if (menuScreen && originalMenuHTML) menuScreen.innerHTML = originalMenuHTML;
        alert(`❌ Exercícios de "${activityLabel}" não encontrados!`);
        return;
    }

    currentExercises = allExercises[entryKey];
    userAnswers = {};

    console.log(`✅ ${currentExercises.length} exercícios carregados para ${activityLabel}`);

    if (menuScreen && exerciseScreen) {
        menuScreen.classList.add('hidden');
        menuScreen.style.display = 'none';
        
        exerciseScreen.classList.remove('hidden');
        exerciseScreen.style.display = 'block';
        
        const dayNameElement = document.getElementById('current-day-name');
        const totalExercisesElement = document.getElementById('total-exercises');
        
        if (dayNameElement) dayNameElement.textContent = activityLabel;
        if (totalExercisesElement) totalExercisesElement.textContent = currentExercises.length;

        renderExercises();
    } else {
        console.log('✅ Exercícios carregados (modo teste - sem interface)');
    }
}

// Carregar exercícios do dia
async function loadDay(day) {
    return loadExerciseSet({
        dataFile: exerciseFilesByLevel[currentLevel] || exerciseFilesByLevel.seed,
        entryKey: day,
        activityLabel: dayNames[day] || day,
        worksheetId: `${currentLevel || 'seed'}_${day}`
    });
}

async function loadLevelTest() {
    const testConfig = testFilesByLevel[currentLevel];

    if (!testConfig) {
        alert(`❌ Não há teste disponível para o nível ${currentLevel.toUpperCase()}.`);
        return;
    }

    return loadExerciseSet({
        dataFile: testConfig.file,
        entryKey: testConfig.key,
        activityLabel: testConfig.label,
        worksheetId: `${currentLevel}_test`
    });
}

// Renderizar exercícios
function renderExercises() {
    const container = document.getElementById('exercises-container');
    container.innerHTML = '';

    currentExercises.forEach((exercise, index) => {
        const card = document.createElement('div');
        card.className = 'exercise-card';
        card.id = `exercise-${index}`;

        let inputHTML = '';

        switch(exercise.type) {
            case 'fill-blank':
            case 'translate':
            case 'complete':
                inputHTML = `
                    <input 
                        type="text" 
                        class="exercise-input" 
                        id="answer-${index}"
                        placeholder="Digite sua resposta aqui..."
                        onchange="saveAnswer(${index}, this.value)"
                    >
                `;
                break;

            case 'multiple-choice':
            case 'vocabulary':
                inputHTML = `
                    <div class="options-container">
                        ${exercise.options.map((option, optIndex) => `
                            <button 
                                class="option-button" 
                                onclick="selectOption(${index}, ${optIndex}, \`${option}\`)"
                                id="option-${index}-${optIndex}"
                            >
                                ${String.fromCharCode(65 + optIndex)}) ${option}
                            </button>
                        `).join('')}
                    </div>
                `;
                break;

            case 'match':
                inputHTML = `
                    <input 
                        type="text" 
                        class="exercise-input" 
                        id="answer-${index}"
                        placeholder="Digite a letra correspondente (ex: A, B, C...)"
                        onchange="saveAnswer(${index}, this.value.toUpperCase())"
                    >
                    <div style="margin-top: 10px; font-size: 0.9em; color: #666;">
                        ${exercise.hint || ''}
                    </div>
                `;
                break;
        }

        card.innerHTML = `
            <span class="exercise-type">${getTypeLabel(exercise.type)}</span>
            <div class="exercise-question">
                <strong>${index + 1}.</strong> ${exercise.question}
            </div>
            ${inputHTML}
        `;

        container.appendChild(card);
    });

    updateProgress();
}

// Obter label do tipo de exercício
function getTypeLabel(type) {
    const labels = {
        'fill-blank': '📝 Preencher',
        'multiple-choice': '✅ Múltipla Escolha',
        'vocabulary': '📖 Vocabulário',
        'translate': '🔄 Tradução',
        'complete': '✏️ Completar',
        'match': '🔗 Relacionar'
    };
    return labels[type] || '📚 Exercício';
}

// Salvar resposta
function saveAnswer(index, answer) {
    userAnswers[index] = answer;
    updateProgress();
}

// Selecionar opção em múltipla escolha
function selectOption(exerciseIndex, optionIndex, optionText) {
    // Remover seleção anterior
    const allOptions = document.querySelectorAll(`[id^="option-${exerciseIndex}-"]`);
    allOptions.forEach(opt => opt.classList.remove('selected'));

    // Adicionar seleção atual
    const selectedOption = document.getElementById(`option-${exerciseIndex}-${optionIndex}`);
    selectedOption.classList.add('selected');

    // Salvar resposta
    saveAnswer(exerciseIndex, optionText);
}

// Atualizar barra de progresso
function updateProgress() {
    const answeredCount = Object.keys(userAnswers).length;
    const totalCount = currentExercises.length;
    const percentage = (answeredCount / totalCount) * 100;

    document.getElementById('current-exercise').textContent = answeredCount;
    document.getElementById('progress-fill').style.width = `${percentage}%`;

    // Habilitar/desabilitar botão de envio
    const submitButton = document.getElementById('submit-button');
    if (answeredCount === totalCount) {
        submitButton.disabled = false;
    } else {
        submitButton.disabled = true;
    }
}

// Enviar exercícios para a API
async function submitExercises() {
    const messageContainer = document.getElementById('message-container');
    messageContainer.innerHTML = '';

    // Verificar se todas as respostas foram preenchidas
    if (Object.keys(userAnswers).length !== currentExercises.length) {
        messageContainer.innerHTML = `
            <div class="error-message">
                ⚠️ Por favor, responda todos os exercícios antes de enviar!
            </div>
        `;
        return;
    }

    // Calcular pontuação
    const score = calculateScore();

    // Preparar dados completos para backup local
    const fullData = {
        day: currentDay,
        dayName: currentActivityLabel || dayNames[currentDay] || currentDay,
        timestamp: new Date().toISOString(),
        studentName: prompt('Digite seu nome:') || 'Anônimo',
        lesson: currentActivityLabel || 'Practice Set',
        exercises: currentExercises.map((exercise, index) => ({
            exerciseNumber: index + 1,
            type: exercise.type,
            question: exercise.question,
            correctAnswer: exercise.correctAnswer,
            userAnswer: userAnswers[index],
            isCorrect: checkAnswer(exercise, userAnswers[index])
        })),
        score: score
    };

    // Salvar no localStorage (backup)
    saveToLocalStorage(fullData);

    // Preparar dados para API no formato solicitado
    const apiData = {
        timestamp: fullData.timestamp,
        student: fullData.studentName,
        worksheetId: currentWorksheetId || `${currentLevel || 'seed'}_${currentDay}`,
        total: score.total,
        correct: score.correct,
        payload: fullData.exercises
    };

    // Enviar para API
    try {
        document.getElementById('submit-button').disabled = true;
        document.getElementById('submit-button').textContent = '📤 Enviando...';

        const response = await fetch(API_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify(apiData)
        });

        // Com no-cors, não conseguimos verificar response.ok, mas o envio funcionou
        messageContainer.innerHTML = `
            <div class="success-message">
                ✅ Respostas enviadas com sucesso!<br>
                Pontuação: ${score.correct}/${score.total}
                (${score.percentage}%)
            </div>
        `;
        
        // Desabilitar inputs após envio
        disableAllInputs();
        
    } catch (error) {
        console.error('Erro ao enviar:', error);
        messageContainer.innerHTML = `
            <div class="error-message">
                ❌ Erro ao enviar para o servidor.<br>
                Suas respostas foram salvas localmente.<br>
                <small>Erro: ${error.message}</small>
            </div>
        `;
    } finally {
        document.getElementById('submit-button').textContent = '📤 Enviar Respostas';
    }
}

// Verificar resposta
function checkAnswer(exercise, userAnswer) {
    if (!userAnswer) return false;
    
    const correctAnswer = exercise.correctAnswer.toString().toLowerCase().trim();
    const userAnswerClean = userAnswer.toString().toLowerCase().trim();

    // Para múltiplas respostas corretas (separadas por |)
    if (correctAnswer.includes('|')) {
        const possibleAnswers = correctAnswer.split('|').map(a => a.trim());
        return possibleAnswers.some(ans => userAnswerClean === ans);
    }

    return userAnswerClean === correctAnswer;
}

// Calcular pontuação
function calculateScore() {
    let correct = 0;
    let total = currentExercises.length;

    currentExercises.forEach((exercise, index) => {
        if (checkAnswer(exercise, userAnswers[index])) {
            correct++;
        }
    });

    return {
        correct: correct,
        total: total,
        percentage: Math.round((correct / total) * 100)
    };
}

// Salvar no localStorage
function saveToLocalStorage(data) {
    const key = `speakup_${currentDay}_${Date.now()}`;
    localStorage.setItem(key, JSON.stringify(data));
    console.log('Dados salvos localmente:', key);
}

// Desabilitar todos os inputs após envio
function disableAllInputs() {
    const inputs = document.querySelectorAll('.exercise-input, .option-button');
    inputs.forEach(input => input.disabled = true);
}

// Voltar ao menu
function backToMenu() {
    if (Object.keys(userAnswers).length > 0) {
        const confirm = window.confirm('Você tem respostas não enviadas. Deseja realmente voltar ao menu?');
        if (!confirm) return;
    }

    const exerciseScreen = document.getElementById('exercise-screen');
    const menuScreen = document.getElementById('menu-screen');
    
    // Restaurar HTML original do menu
    if (menuScreen && originalMenuHTML) {
        menuScreen.innerHTML = originalMenuHTML;
        console.log('🔄 HTML do menu restaurado');
    }
    
    exerciseScreen.classList.add('hidden');
    exerciseScreen.style.display = 'none';
    
    menuScreen.classList.remove('hidden');
    menuScreen.style.display = 'block';
    
    // Limpar dados
    currentDay = '';
    currentExercises = [];
    userAnswers = {};
    currentActivityLabel = '';
    currentWorksheetId = '';
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ SpeakUp - Sistema de Exercícios carregado!');
    console.log('📁 Funções disponíveis:', {
        loadDay: typeof loadDay,
        backToMenu: typeof backToMenu,
        submitExercises: typeof submitExercises
    });
    
    // Verificar se os elementos existem
    const menuScreen = document.getElementById('menu-screen');
    const exerciseScreen = document.getElementById('exercise-screen');
    
    console.log('📄 Elementos encontrados:', {
        menuScreen: !!menuScreen,
        exerciseScreen: !!exerciseScreen
    });
    
    // Carregar códigos das turmas
    loadTurmasCodes();
    
    // Testar carregamento do JSON
    console.log('🧪 Testando carregamento do JSON...');
    fetch('./exercises.json')
        .then(response => {
            console.log('📡 Resposta do fetch:', response.status, response.ok);
            return response.json();
        })
        .then(data => {
            console.log('✅ JSON carregado com sucesso!');
            console.log('📊 Dias disponíveis:', Object.keys(data));
            console.log('📝 Exercícios na segunda:', data.monday ? data.monday.length : 'N/A');
        })
        .catch(error => {
            console.error('❌ Erro ao carregar JSON:', error);
        });
});

// Disponibilizar funções globalmente (para garantir)
window.selectLevel = selectLevel;
window.loadDay = loadDay;
window.backToMenu = backToMenu;
window.submitExercises = submitExercises;
window.saveAnswer = saveAnswer;
window.selectOption = selectOption;
window.showVideos = showVideos;
window.backToMenuFromVideos = backToMenuFromVideos;
window.loadLevelTest = loadLevelTest;

console.log('🌍 Funções exportadas para window:', {
    loadDay: typeof window.loadDay,
    backToMenu: typeof window.backToMenu,
    submitExercises: typeof window.submitExercises,
    showVideos: typeof window.showVideos,
    backToMenuFromVideos: typeof window.backToMenuFromVideos
});

// Função para mostrar a tela de vídeos
function showVideos() {
    console.log('🎥 Abrindo tela de vídeos...');
    console.log('📊 Nível atual:', currentLevel);
    
    const menuScreen = document.getElementById('menu-screen');
    const videosScreen = document.getElementById('videos-screen');
    const videosContainer = document.getElementById('videos-container');
    
    if (!menuScreen || !videosScreen || !videosContainer) {
        console.error('❌ Elementos da interface não encontrados');
        return;
    }
    
    // Salvar HTML original do menu (se ainda não salvou)
    if (!originalMenuHTML) {
        originalMenuHTML = menuScreen.innerHTML;
        console.log('💾 HTML original do menu salvo');
    }
    
    // Limpar container de vídeos
    videosContainer.innerHTML = '';
    
    // Definir vídeos baseado no nível
    let videos = [];
    
    if (currentLevel === 'seed') {
        videos = [
            { title: '📚 Seed - Lesson 01', url: 'https://www.youtube.com/embed/bmWPdq6jw3Q' },
            { title: '📚 Seed - Lesson 02', url: 'https://www.youtube.com/embed/Sp_9i-j3Ryw' },
            { title: '📚 Seed - Lesson 02(Extra)', url: 'https://www.youtube.com/embed/ED1K6BJ8PoU?si=noBJM_2NaPzbOaTM' },
            { title: '📚 Seed - Lesson 03', url: 'https://www.youtube.com/embed/ihadFWLnAs8?si=-Q583abdczTiNkAp' },
            { title: '📚 Seed - Lesson 04', url: 'https://www.youtube.com/embed/_cG368DlSEo?si=3r2HSCXHqVkedjfp' },
            { title: '📚 Seed - Lesson 05', url: 'https://www.youtube.com/embed/ySo1qYziThg?si=6SgSxd4P5w6NRB63' },
            { title: '📚 Seed - Lesson 06', url: 'https://www.youtube.com/embed/HgLvdAD-Uu4?si=q9kCRXbJpJgUfy8l' },
            { title: '📚 Seed - Lesson 07', url: 'https://www.youtube.com/embed/-ymGgMrYJhA?si=9lK7mwVgXJ_QY0Jz' },

        ];
    } else if (currentLevel === 'root') {
        // Aqui você pode adicionar vídeos do Root no futuro
        videos = [
            { title: '📚 Root - Lesson 01', url: 'https://www.youtube.com/embed/6DArC_SJ7Uw?si=C2ASh0RrQu2GWE-8' },
            { title: '📚 Root - Lesson 02', url: 'https://www.youtube.com/embed/4zqE4uznWxk?si=8JaDLu53E_ju0aa0' },
            { title: '📚 Root - Lesson 03', url: 'https://www.youtube.com/embed/hf_d0Mk6T_0?si=twOJYtRxyJvu1jMX' },
            { title: '📚 Root - Lesson 05', url: 'https://www.youtube.com/embed/hv-ctQAtXrA?si=dbrLINCpIHg6SHIF' },
            { title: '📚 Root - Lesson 07', url: 'https://www.youtube.com/embed/KWVWlfrZMsE?si=bGQUTOVuMdoQTxT4' },
        ];
    } else if (currentLevel === 'leaf') {
        // Vídeos do Leaf - adicione os vídeos quando estiverem disponíveis
        videos = [
            { title: '📚 Leaf - Lesson 01', url: 'https://www.youtube.com/embed/4zeyh5wB2ic?si=2JTLi98zbPiU8QW3' },
            { title: '📚 Leaf - Lesson 04', url: 'https://www.youtube.com/embed/oWVmJkaiorc?si=i3Z3TByA35DjMurG' },
        ];
    }
    
    // Verificar se há vídeos disponíveis
    if (videos.length === 0) {
        videosContainer.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #666;">
                <h3>🎬 Em Breve!</h3>
                <p>As aulas gravadas para o nível ${currentLevel.toUpperCase()} estarão disponíveis em breve.</p>
            </div>
        `;
    } else {
        // Criar cards de vídeo
        videos.forEach(video => {
            const videoCard = document.createElement('div');
            videoCard.className = 'video-card';
            videoCard.innerHTML = `
                <h3 class="video-title">${video.title}</h3>
                <div class="video-wrapper">
                    <iframe 
                        src="${video.url}" 
                        frameborder="0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                        allowfullscreen>
                    </iframe>
                </div>
            `;
            videosContainer.appendChild(videoCard);
        });
    }
    
    // Esconder menu e mostrar vídeos
    menuScreen.classList.add('hidden');
    menuScreen.style.display = 'none';
    
    videosScreen.classList.remove('hidden');
    videosScreen.style.display = 'block';
    
    console.log(`✅ Tela de vídeos exibida para nível: ${currentLevel}`);
}

// Função para voltar ao menu a partir da tela de vídeos
function backToMenuFromVideos() {
    console.log('🔙 Voltando ao menu...');
    
    const videosScreen = document.getElementById('videos-screen');
    const menuScreen = document.getElementById('menu-screen');
    
    if (!videosScreen || !menuScreen) {
        console.error('❌ Elementos da interface não encontrados');
        return;
    }
    
    // Restaurar HTML original do menu
    if (originalMenuHTML) {
        menuScreen.innerHTML = originalMenuHTML;
        console.log('🔄 HTML do menu restaurado');
    }
    
    // Esconder vídeos e mostrar menu
    videosScreen.classList.add('hidden');
    videosScreen.style.display = 'none';
    
    menuScreen.classList.remove('hidden');
    menuScreen.style.display = 'block';
    
    console.log('✅ Menu exibido');
}

// ===== FUNÇÕES DE PODCASTS =====

// Lista de podcasts disponíveis por nível
const podcastsList = {
    seed: [
        {
            id: 1,
            title: 'Episode 01 - Greetings & Introductions',
            description: 'Learn basic greetings and how to introduce yourself in English.',
            audioFile: 'aulas/Seed/Podcasts/podcast_episode01.wav',
            scriptFile: 'aulas/Seed/Podcasts/podcast_audioscript.md',
            duration: '5:00',
            level: 'seed'
        },
        {
            id: 2,
            title: 'Episode 02 - Numbers & Family',
            description: 'Practice talking about numbers, ages, and family members.',
            audioFile: 'aulas/Seed/Podcasts/podcast_episode02.wav',
            scriptFile: 'aulas/Seed/Podcasts/podcast_audioscript02.md',
            duration: '5:30',
            level: 'seed'
        }
    ],
    root: [
        {
            id: 1,
            title: 'Episode 01 - Travel & Trips',
            description: 'Listen to Alex and Sam talking about their travel experiences and vacation plans.',
            audioFile: 'aulas/Root/Podcasts/podcast_episode01.wav',
            scriptFile: 'aulas/Root/Podcasts/podcast_audioscript.md',
            duration: '5:00',
            level: 'root'
        },
        {
            id: 2,
            title: 'Episode 02 - Past Experiences & Future Plans',
            description: 'Talk about what you did recently and discuss future plans using past and future tenses.',
            audioFile: 'aulas/Root/Podcasts/podcast_episode02.wav',
            scriptFile: 'aulas/Root/Podcasts/podcast_audioscript_02.md',
            duration: '5:30',
            level: 'root'
        }
    ],
    leaf: [
        {
            id: 1,
            title: 'Episode 01 - Career Advice & Modal Verbs',
            description: 'Maya and Daniel discuss career changes and practice using modal verbs for advice and suggestions.',
            audioFile: 'aulas/Leaf/Podcasts/podcast_episode01.wav',
            scriptFile: 'aulas/Leaf/Podcasts/Podcast_audioscript.md',
            duration: '6:00',
            level: 'leaf'
        }
    ]
};

let currentPodcast = null;

// Lista de slides disponíveis por nível (atualizada automaticamente)
const slidesList = {
    seed: [
        { id: 2, title: 'Lesson 02 - Numbers & Age', description: 'Learn numbers, ages, and how to talk about age in English', pdfFile: 'aulas/Seed/slide/Seed_Lesson02.pdf' },
        { id: 3, title: 'Lesson 03 - Family & Relationships', description: 'Vocabulary and expressions about family members and relationships', pdfFile: 'aulas/Seed/slide/Seed_Lesson03.pdf' },
        { id: 4, title: 'Lesson 04 - Daily Routines', description: 'Present simple tense and daily routine vocabulary', pdfFile: 'aulas/Seed/slide/Seed_Lesson04.pdf' },
        { id: 5, title: 'Lesson 05 - Foods & Meals', description: 'Present continuous and food vocabulary', pdfFile: 'aulas/Seed/slide/Seed_Lesson05.pdf' },
        { id: 6, title: 'Lesson 06 - Places in the City', description: 'Vocabulary for places in the city and giving directions', pdfFile: 'aulas/Seed/slide/Seed_Lesson06.pdf' },
        { id: 7, title: 'Lesson 07 - Free Time & Hobbies', description: 'Talking about free time activities and hobbies', pdfFile: 'aulas/Seed/slide/Seed_Lesson07.pdf' },
        { id: 8, title: 'Lesson 08 - Clothes & Shopping', description: 'Clothing vocabulary and shopping expressions', pdfFile: 'aulas/Seed/slide/Seed_Lesson08.pdf' },
        { id: 9, title: 'Lesson 09 - Weather & Seasons', description: 'Weather vocabulary and describing seasons', pdfFile: 'aulas/Seed/slide/Seed_Lesson09.pdf' },
        { id: 10, title: 'Lesson 10 - Health & Habits', description: 'Health vocabulary and talking about routines', pdfFile: 'aulas/Seed/slide/Seed_Lesson10.pdf' },
        { id: 11, title: 'Lesson 11 - Review & Practice', description: 'Consolidation activities and review', pdfFile: 'aulas/Seed/slide/Seed_Lesson11.pdf' },
        { id: 12, title: 'Lesson 12 - Final Review', description: 'Final review and consolidation for the Seed level', pdfFile: 'aulas/Seed/slide/Seed_Lesson12.pdf' }
    ],
    root: [
        { id: 2, title: 'Lesson 02 - Past Experiences', description: 'Simple past tense and talking about past events', pdfFile: 'aulas/Root/slide/Root_Lesson02.pdf' },
        { id: 3, title: 'Lesson 03 - Travel & Adventures', description: 'Travel vocabulary and past experiences with irregular verbs', pdfFile: 'aulas/Root/slide/Root_Lesson03.pdf' },
        { id: 4, title: 'Lesson 04 - Technology & Communication', description: 'Technology vocabulary and present perfect tense', pdfFile: 'aulas/Root/slide/Root _Lesson04.pdf' },
        { id: 5, title: 'Lesson 05 - Appearance & Personality', description: 'Vocabulary related to appearance and personality traits', pdfFile: 'aulas/Root/slide/Root_Lesson05.pdf' },
        { id: 6, title: 'Lesson 06 - Future Plans', description: 'Future tenses and expressions for talking about plans', pdfFile: 'aulas/Root/slide/Root_Lesson06.pdf' },
        { id: 7, title: 'Lesson 07 - Health & Lifestyle', description: 'Health vocabulary and talking about habits and lifestyle', pdfFile: 'aulas/Root/slide/Root_Lesson07.pdf' },
        { id: 8, title: 'Lesson 08 - Shopping & Money', description: 'Shopping vocabulary and expressions for buying and selling', pdfFile: 'aulas/Root/slide/Root_Lesson08.pdf' },
        { id: 9, title: 'Lesson 09 - Media & Entertainment', description: 'Talking about media, films and entertainment', pdfFile: 'aulas/Root/slide/Root _Lesson09.pdf' },
        { id: 10, title: 'Lesson 10 - Work & Jobs', description: 'Work vocabulary and talking about jobs', pdfFile: 'aulas/Root/slide/Root _Lesson10.pdf' },
        { id: 11, title: 'Lesson 11 - Society & Culture', description: 'Discussing social topics and cultural differences', pdfFile: 'aulas/Root/slide/Root _Lesson11.pdf' },
        { id: 12, title: 'Lesson 12 - Exam Practice', description: 'Practice materials and mock tasks', pdfFile: 'aulas/Root/slide/Root_Lesson12.pdf' }
    ],
    leaf: [
        { id: 1, title: 'Lesson 01 - Career Advice & Modal Verbs', description: 'Introduction to career advice vocabulary and modal verbs usage', pdfFile: 'aulas/Leaf/slide/Leaf_Lesson01.pdf' },
        { id: 2, title: 'Lesson 02 - Advanced Conversations', description: 'Complex sentence structures and conversational expressions', pdfFile: 'aulas/Leaf/slide/Leaf_Lesson02.pdf' },
        { id: 3, title: 'Lesson 03 - Comparisons and connectors', description: 'Comparative forms, and connectors for complex sentences', pdfFile: 'aulas/Leaf/slide/Leaf_Lesson03.pdf' },
        { id: 4, title: 'Lesson 04 - Debates & Discussion', description: 'Techniques for debating and structuring arguments', pdfFile: 'aulas/Leaf/slide/Leaf_Lesson04.pdf' },
        { id: 5, title: 'Lesson 05 - Idioms & Expressions', description: 'Common idioms and useful expressions', pdfFile: 'aulas/Leaf/slide/Leaf_Lesson05.pdf' },
        { id: 6, title: 'Lesson 06 - Listening Practice', description: 'Listening strategies and practice activities', pdfFile: 'aulas/Leaf/slide/Leaf_Lesson06.pdf' },
        { id: 7, title: 'Lesson 07 - Fluency Boosters', description: 'Exercises to improve speaking fluency', pdfFile: 'aulas/Leaf/slide/Leaf_Lesson07.pdf' }
    ],
    fruit: [
        { id: 1, title: 'Lesson 01 - Advanced Topics', description: 'Complex grammatical structures and advanced vocabulary', pdfFile: 'aulas/Fruit/slide/Fruit_Lesson01.pdf' },
        { id: 2, title: 'Lesson 02 - Professional Communication', description: 'Business English and formal communication skills', pdfFile: 'aulas/Fruit/slide/Fruit_Lesson02.pdf' }
    ]
};

// Função para mostrar a lista de podcasts
function showPodcasts() {
    console.log('🎙️ Abrindo lista de podcasts...');
    console.log('📊 Nível atual:', currentLevel);
    
    const menuScreen = document.getElementById('menu-screen');
    const podcastsScreen = document.getElementById('podcasts-screen');
    const podcastsContainer = document.getElementById('podcasts-container');
    
    if (!menuScreen || !podcastsScreen || !podcastsContainer) {
        console.error('❌ Elementos da interface não encontrados');
        return;
    }
    
    // Salvar HTML original do menu
    if (!originalMenuHTML) {
        originalMenuHTML = menuScreen.innerHTML;
    }
    
    // Limpar container
    podcastsContainer.innerHTML = '';
    
    // Obter podcasts do nível atual
    let podcasts = [];
    
    if (currentLevel === 'seed') {
        podcasts = podcastsList.seed || [];
    } else if (currentLevel === 'root') {
        podcasts = podcastsList.root || [];
    } else if (currentLevel === 'leaf') {
        podcasts = podcastsList.leaf || [];
    }
    
    // Verificar se há podcasts disponíveis
    if (podcasts.length === 0) {
        podcastsContainer.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #666;">
                <h3><i class="fas fa-podcast"></i> Coming Soon!</h3>
                <p>Podcasts for the ${currentLevel.toUpperCase()} level will be available soon.</p>
            </div>
        `;
    } else {
        // Criar cards de podcasts
        podcasts.forEach(podcast => {
            const podcastCard = document.createElement('div');
            podcastCard.className = 'podcast-card';
            podcastCard.onclick = () => openPodcast(podcast);
            podcastCard.innerHTML = `
                <h3><i class="fas fa-podcast"></i> ${podcast.title}</h3>
                <p>${podcast.description}</p>
                <p style="margin-top: 15px; color: #667eea; font-weight: bold;">
                    <i class="fas fa-clock"></i> Duration: ${podcast.duration}
                </p>
            `;
            podcastsContainer.appendChild(podcastCard);
        });
    }
    
    // Esconder menu e mostrar podcasts
    menuScreen.classList.add('hidden');
    menuScreen.style.display = 'none';
    
    podcastsScreen.classList.remove('hidden');
    podcastsScreen.style.display = 'block';
    
    console.log(`✅ Lista de podcasts exibida para nível: ${currentLevel}`);
}

// Função para voltar ao menu a partir da lista de podcasts
function backToMenuFromPodcasts() {
    console.log('🔙 Voltando ao menu...');
    
    const podcastsScreen = document.getElementById('podcasts-screen');
    const menuScreen = document.getElementById('menu-screen');
    
    if (!podcastsScreen || !menuScreen) {
        console.error('❌ Elementos da interface não encontrados');
        return;
    }
    
    // Restaurar HTML original do menu
    if (originalMenuHTML) {
        menuScreen.innerHTML = originalMenuHTML;
    }
    
    // Esconder podcasts e mostrar menu
    podcastsScreen.classList.add('hidden');
    podcastsScreen.style.display = 'none';
    
    menuScreen.classList.remove('hidden');
    menuScreen.style.display = 'block';
    
    console.log('✅ Menu exibido');
}

// Função para abrir um podcast específico
async function openPodcast(podcast) {
    console.log('🎧 Abrindo podcast:', podcast.title);
    
    currentPodcast = podcast;
    
    const podcastsScreen = document.getElementById('podcasts-screen');
    const playerScreen = document.getElementById('podcast-player-screen');
    const podcastTitle = document.getElementById('podcast-title');
    const audioSource = document.getElementById('podcast-audio-source');
    const audioPlayer = document.getElementById('podcast-audio');
    const scriptContainer = document.getElementById('podcast-script-container');
    
    if (!podcastsScreen || !playerScreen) {
        console.error('❌ Elementos da interface não encontrados');
        return;
    }
    
    // Atualizar título
    podcastTitle.innerHTML = `<i class="fas fa-podcast"></i> ${podcast.title}`;
    
    // Configurar áudio
    audioSource.src = podcast.audioFile;
    audioPlayer.load();
    
    // Carregar script do podcast
    try {
        const response = await fetch(podcast.scriptFile);
        if (response.ok) {
            const scriptText = await response.text();
            // Converter markdown para HTML básico
            scriptContainer.innerHTML = convertMarkdownToHTML(scriptText);
        } else {
            scriptContainer.innerHTML = '<p style="color: #666;">Script not available.</p>';
        }
    } catch (error) {
        console.error('Erro ao carregar script:', error);
        scriptContainer.innerHTML = '<p style="color: #666;">Error loading script.</p>';
    }
    
    // Esconder lista e mostrar player
    podcastsScreen.classList.add('hidden');
    podcastsScreen.style.display = 'none';
    
    playerScreen.classList.remove('hidden');
    playerScreen.style.display = 'block';
    
    console.log('✅ Podcast aberto');
}

// Função para voltar à lista de podcasts
function backToPodcastsList() {
    console.log('🔙 Voltando à lista de podcasts...');
    
    const playerScreen = document.getElementById('podcast-player-screen');
    const podcastsScreen = document.getElementById('podcasts-screen');
    const audioPlayer = document.getElementById('podcast-audio');
    
    if (!playerScreen || !podcastsScreen) {
        console.error('❌ Elementos da interface não encontrados');
        return;
    }
    
    // Pausar áudio
    audioPlayer.pause();
    
    // Esconder player e mostrar lista
    playerScreen.classList.add('hidden');
    playerScreen.style.display = 'none';
    
    podcastsScreen.classList.remove('hidden');
    podcastsScreen.style.display = 'block';
    
    console.log('✅ Lista de podcasts exibida');
}

// Função para fazer download do podcast
function downloadPodcast() {
    if (!currentPodcast) {
        alert('No podcast selected');
        return;
    }
    
    console.log('💾 Iniciando download do podcast:', currentPodcast.title);
    
    const link = document.createElement('a');
    link.href = currentPodcast.audioFile;
    link.download = `${currentPodcast.title.replace(/[^a-z0-9]/gi, '_')}.wav`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log('✅ Download iniciado');
}

// Função auxiliar para converter Markdown básico em HTML
function convertMarkdownToHTML(markdown) {
    let html = markdown;
    
    // Converter headers
    html = html.replace(/### (.*?)$/gm, '<h3>$1</h3>');
    html = html.replace(/## (.*?)$/gm, '<h2>$1</h2>');
    
    // Converter negrito
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Converter linhas horizontais
    html = html.replace(/^---$/gm, '<hr>');
    
    // Converter quebras de linha duplas em parágrafos
    const lines = html.split('\n');
    let inParagraph = false;
    let result = '';
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (line === '') {
            if (inParagraph) {
                result += '</p>';
                inParagraph = false;
            }
        } else if (!line.startsWith('<h') && !line.startsWith('<hr')) {
            if (!inParagraph) {
                result += '<p>';
                inParagraph = true;
            }
            result += line + ' ';
        } else {
            if (inParagraph) {
                result += '</p>';
                inParagraph = false;
            }
            result += line;
        }
    }
    
    if (inParagraph) {
        result += '</p>';
    }
    
    return result;
}

// ============================================
// FUNÇÕES DE SLIDES
// ============================================

// Função para mostrar a tela de slides
function showSlides() {
    console.log('📊 Abrindo tela de slides...');
    console.log('📊 Nível atual:', currentLevel);
    
    const menuScreen = document.getElementById('menu-screen');
    const slidesScreen = document.getElementById('slides-screen');
    const slidesContainer = document.getElementById('slides-container');
    
    if (!menuScreen || !slidesScreen || !slidesContainer) {
        console.error('❌ Elementos da interface não encontrados');
        return;
    }
    
    // Salvar HTML original do menu
    if (!originalMenuHTML) {
        originalMenuHTML = menuScreen.innerHTML;
        console.log('💾 HTML original do menu salvo');
    }
    
    // Limpar container
    slidesContainer.innerHTML = '';
    
    // Obter slides do nível atual
    let slides = [];
    
    if (currentLevel === 'seed') {
        slides = slidesList.seed || [];
    } else if (currentLevel === 'root') {
        slides = slidesList.root || [];
    } else if (currentLevel === 'leaf') {
        slides = slidesList.leaf || [];
    } else if (currentLevel === 'fruit') {
        slides = slidesList.fruit || [];
    }
    
    // Verificar se há slides disponíveis
    if (slides.length === 0) {
        slidesContainer.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #666;">
                <h3><i class="fas fa-presentation"></i> Coming Soon!</h3>
                <p>Lesson slides for the <strong>${currentLevel.toUpperCase()}</strong> level will be available soon.</p>
            </div>
        `;
    } else {
        // Criar cards de slides
        slides.forEach(slide => {
            const slideCard = document.createElement('div');
            slideCard.className = 'slide-card';
            slideCard.innerHTML = `
                <h3 class="slide-title">
                    <i class="fas fa-file-powerpoint"></i>
                    ${slide.title}
                </h3>
                <p style="color: #666; margin: 10px 0;">${slide.description}</p>
                <div class="slide-buttons">
                    <button class="view-slide-btn" onclick="viewSlide('${slide.pdfFile}')" style="width: 100%;">
                        <i class="fas fa-eye"></i> View Slides
                    </button>
                </div>
            `;
            slidesContainer.appendChild(slideCard);
        });
    }
    
    // Esconder menu e mostrar slides
    menuScreen.classList.add('hidden');
    menuScreen.style.display = 'none';
    
    slidesScreen.classList.remove('hidden');
    slidesScreen.style.display = 'block';
    
    console.log(`✅ Tela de slides exibida para nível: ${currentLevel}`);
}

// Função para visualizar slide em PDF (abre em nova aba)
function viewSlide(pdfUrl) {
    console.log('👁️ Abrindo slide:', pdfUrl);
    window.open(pdfUrl, '_blank');
}

// Função para voltar dos slides ao menu
function backFromSlides() {
    console.log('🔙 Voltando dos slides ao menu...');
    
    const menuScreen = document.getElementById('menu-screen');
    const slidesScreen = document.getElementById('slides-screen');
    
    if (!menuScreen || !slidesScreen) {
        console.error('❌ Elementos da interface não encontrados');
        return;
    }
    
    // Esconder tela de slides
    slidesScreen.classList.add('hidden');
    slidesScreen.style.display = 'none';
    
    // Restaurar e mostrar menu
    if (originalMenuHTML) {
        menuScreen.innerHTML = originalMenuHTML;
    }
    menuScreen.classList.remove('hidden');
    menuScreen.style.display = 'block';
    
    console.log('✅ Voltou ao menu com sucesso');
}
