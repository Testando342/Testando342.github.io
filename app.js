// Configuração da API Gemini via Netlify Function
const API_URL = "/.netlify/functions/gemini";

// Estado da aplicação
let currentLesson = null;
let lessons = loadLessons();
let conversationHistory = [];

// Elementos DOM - Carregados após o DOM estar pronto
let chatMessages;
let messageInput;
let sendButton;
let createLessonButton;
let clearChatButton;
let currentLessonTitle;
let folderContainer;

// Inicialização após o DOM estar pronto
document.addEventListener('DOMContentLoaded', () => {
    // Elementos DOM
    chatMessages = document.getElementById('chatMessages');
    messageInput = document.getElementById('messageInput');
    sendButton = document.getElementById('sendMessage');
    createLessonButton = document.getElementById('createLesson');
    clearChatButton = document.getElementById('clearChat');
    currentLessonTitle = document.getElementById('currentLessonTitle');
    folderContainer = document.getElementById('folderContainer');

    // Event Listeners
    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
    createLessonButton.addEventListener('click', createLesson);
    clearChatButton.addEventListener('click', clearChat);

    // Renderiza as pastas e aulas salvas
    renderFolders();
});

// Funções
function loadLessons() {
    const savedLessons = localStorage.getItem('homeschoolLessons');
    return savedLessons ? JSON.parse(savedLessons) : {};
}

function saveLessons() {
    localStorage.setItem('homeschoolLessons', JSON.stringify(lessons));
}

function createLesson() {
    const subject = document.getElementById('subject').value.trim();
    const grade = document.getElementById('grade').value.trim();
    const title = document.getElementById('lessonTitle').value.trim();
    const perspective = document.getElementById('perspective').value;

    if (!subject || !grade || !title) {
        alert('Por favor, preencha todos os campos obrigatórios.');
        return;
    }

    // Criar estrutura da aula
    const lessonId = Date.now().toString();
    const lesson = {
        id: lessonId,
        subject,
        grade,
        title,
        perspective,
        conversation: [],
        createdAt: new Date().toISOString()
    };

    // Adicionar à estrutura de dados (etapa > matéria > aula)
    if (!lessons[grade]) {
        lessons[grade] = {};
    }
    if (!lessons[grade][subject]) {
        lessons[grade][subject] = {};
    }
    lessons[grade][subject][lessonId] = lesson;

    // Salvar e atualizar UI
    saveLessons();
    renderFolders();
    
    // Carregar a aula recém-criada
    loadLesson(lesson);
    
    // Iniciar a conversa com o chatbot
    startLessonConversation(lesson);
}

function startLessonConversation(lesson) {
    clearChat();
    
    const prompt = generatePromptForLesson(lesson);
    addMessageToChat('user', `Por favor, crie uma aula sobre "${lesson.title}"`);
    
    // Mostrar indicador de carregamento
    const sendButtonContent = sendButton.querySelector('.send-button-content');
    sendButtonContent.innerHTML = '<div class="loading"></div><span>Enviando...</span>';
    sendButton.disabled = true;
    
    // Chamar a API Gemini via Netlify Function
    fetchGeminiResponse(prompt)
        .then(response => {
            addMessageToChat('bot', response);
            
            // Salvar na conversa da aula
            lesson.conversation.push({
                role: 'user',
                content: `Por favor, crie uma aula sobre "${lesson.title}"`
            });
            lesson.conversation.push({
                role: 'bot',
                content: response
            });
            saveLessons();
        })
        .catch(error => {
            console.error('Erro ao gerar aula:', error);
            addMessageToChat('bot', 'Desculpe, ocorreu um erro ao gerar a aula. Por favor, tente novamente.');
        })
        .finally(() => {
            // Restaurar botão enviar
            sendButtonContent.innerHTML = '<span>Enviar</span>';
            sendButton.disabled = false;
        });
}

function generatePromptForLesson(lesson) {
    let prompt = '';
    
    // Prompt base para contexto do chatbot
    const basePrompt = `Você é um assistente educacional para ensino domiciliar. 
        Sua tarefa é criar uma aula sobre "${lesson.title}" para um estudante de ${lesson.grade} na matéria de ${lesson.subject}.`;
    
    // Adicionar perspectiva específica
    switch(lesson.perspective) {
        case 'desenvolvimento':
            prompt = `${basePrompt}
            Foque na perspectiva de DESENVOLVIMENTO PESSOAL, explicando a origem e história do conteúdo,
            de onde ele surgiu, quem foram os principais pensadores/criadores e como evoluiu ao longo do tempo.
            Explique também como esse conhecimento contribui para o crescimento pessoal e intelectual do estudante.`;
            break;
        case 'cidadania':
            prompt = `${basePrompt}
            Foque na perspectiva de CIDADANIA, explicando o propósito e relevância social deste conteúdo,
            para que ele é utilizado na sociedade, como contribui para o bem comum, e como se relaciona
            com questões cívicas, éticas e de participação social.`;
            break;
        case 'trabalho':
            prompt = `${basePrompt}
            Foque na perspectiva de QUALIFICAÇÃO PARA O TRABALHO, explicando como este conteúdo
            é aplicado na vida profissional, quais carreiras e profissões utilizam este conhecimento,
            e como o estudante pode desenvolver habilidades práticas relacionadas a este tema.`;
            break;
        default: // Geral
            prompt = `${basePrompt}
            Aborde o conteúdo de forma equilibrada, incluindo:
            1. DESENVOLVIMENTO PESSOAL: a origem e história do conteúdo
            2. CIDADANIA: o propósito e a relevância social deste conteúdo
            3. QUALIFICAÇÃO PARA O TRABALHO: como este conteúdo é aplicado na vida profissional`;
    }
    
    // Adicionar instruções de formato
    prompt += `
    
    Estruture sua resposta com:
    1. Uma introdução engajadora que capte o interesse do estudante
    2. O conteúdo principal explicado de forma clara e adaptada para ensino domiciliar
    3. Exemplos práticos e relevantes
    4. Uma conclusão que conecte o aprendizado com a vida do estudante
    5. Sugestões de atividades práticas que podem ser realizadas em casa

    Use linguagem adequada para a etapa escolar ${lesson.grade}, seja educativo mas também motivador.`;
    
    return prompt;
}

async function fetchGeminiResponse(prompt) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                prompt: prompt
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Erro na API Gemini');
        }
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error.message || 'Erro na API Gemini');
        }
        
        return data.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error('Erro ao chamar API Gemini:', error);
        throw error;
    }
}

function sendMessage() {
    const message = messageInput.value.trim();
    if (!message || !currentLesson) return;
    
    // Limpar input
    messageInput.value = '';
    
    // Adicionar mensagem do usuário ao chat
    addMessageToChat('user', message);
    
    // Construir contexto da conversa
    let conversationContext = '';
    
    // Incluir até 5 mensagens anteriores para contexto
    const recentMessages = currentLesson.conversation.slice(-10);
    if (recentMessages.length > 0) {
        conversationContext = 'Contexto da conversa anterior:\n\n';
        recentMessages.forEach(msg => {
            conversationContext += `${msg.role === 'user' ? 'Usuário' : 'Assistente'}: ${msg.content}\n\n`;
        });
        conversationContext += '\nContinue a conversa respondendo à nova mensagem do usuário:\n\n';
    }
    
    // Criar prompt para a API
    const prompt = `${generatePromptForLesson(currentLesson)}
    
    ${conversationContext}
    
    Nova pergunta do usuário: ${message}
    
    Responda de forma educacional, mantendo o foco no tema da aula "${currentLesson.title}" e na perspectiva escolhida.`;
    
    // Mostrar indicador de carregamento
    const sendButtonContent = sendButton.querySelector('.send-button-content');
    sendButtonContent.innerHTML = '<div class="loading"></div><span>Enviando...</span>';
    sendButton.disabled = true;
    
    // Chamar a API Gemini via Netlify Function
    fetchGeminiResponse(prompt)
        .then(response => {
            addMessageToChat('bot', response);
            
            // Salvar na conversa da aula
            currentLesson.conversation.push({
                role: 'user',
                content: message
            });
            currentLesson.conversation.push({
                role: 'bot',
                content: response
            });
            saveLessons();
        })
        .catch(error => {
            console.error('Erro ao enviar mensagem:', error);
            addMessageToChat('bot', 'Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente.');
        })
        .finally(() => {
            // Restaurar botão enviar
            sendButtonContent.innerHTML = '<span>Enviar</span>';
            sendButton.disabled = false;
        });
}

function addMessageToChat(role, content) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', role === 'user' ? 'user-message' : 'bot-message');
    // Usar marked.parse para renderizar markdown
    content = marked.parse(content);
    messageElement.innerHTML = content;
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function loadLesson(lesson) {
    // Definir aula atual
    currentLesson = lesson;
    
    // Atualizar título
    currentLessonTitle.textContent = `${lesson.subject} - ${lesson.title}`;
    
    // Limpar chat e carregar conversa
    clearChat();
    
    // Carregar conversa existente
    if (lesson.conversation && lesson.conversation.length > 0) {
        lesson.conversation.forEach(message => {
            addMessageToChat(message.role, message.content);
        });
    }
}

function deleteLesson(grade, subject, lessonId) {
    if (confirm('Tem certeza que deseja excluir esta aula? Esta ação não pode ser desfeita.')) {
        delete lessons[grade][subject][lessonId];
        
        // Limpar pastas vazias
        if (Object.keys(lessons[grade][subject]).length === 0) {
            delete lessons[grade][subject];
        }
        if (Object.keys(lessons[grade]).length === 0) {
            delete lessons[grade];
        }
        
        saveLessons();
        renderFolders();
        
        // Se a aula atual foi excluída, limpar o chat
        if (currentLesson && currentLesson.id === lessonId) {
            currentLesson = null;
            currentLessonTitle.textContent = 'Chatbot Educacional';
            clearChat();
        }
    }
}

function clearChat() {
    chatMessages.innerHTML = '';
}

function renderFolders() {
    folderContainer.innerHTML = '';
    
    Object.keys(lessons).sort().forEach(grade => {
        const gradeFolder = document.createElement('div');
        gradeFolder.classList.add('folder');
        
        // Cabeçalho da pasta de etapa
        const gradeHeader = document.createElement('div');
        gradeHeader.classList.add('folder-header');
        gradeHeader.textContent = grade;
        gradeHeader.addEventListener('click', () => {
            const content = gradeHeader.nextElementSibling;
            content.classList.toggle('active');
        });
        
        // Conteúdo da pasta de etapa
        const gradeContent = document.createElement('div');
        gradeContent.classList.add('folder-content');
        
        // Criar pastas de matérias dentro da etapa
        Object.keys(lessons[grade]).sort().forEach(subject => {
            const subjectFolder = document.createElement('div');
            subjectFolder.classList.add('folder');
            
            // Cabeçalho da pasta de matéria
            const subjectHeader = document.createElement('div');
            subjectHeader.classList.add('folder-header');
            subjectHeader.textContent = subject;
            subjectHeader.addEventListener('click', () => {
                const content = subjectHeader.nextElementSibling;
                content.classList.toggle('active');
            });
            
            // Conteúdo da pasta de matéria
            const subjectContent = document.createElement('div');
            subjectContent.classList.add('folder-content');
            
            // Adicionar aulas à pasta de matéria
            Object.values(lessons[grade][subject]).sort((a, b) => a.title.localeCompare(b.title)).forEach(lesson => {
                const lessonItem = document.createElement('div');
                lessonItem.classList.add('lesson-item');
                
                const lessonTitle = document.createElement('div');
                lessonTitle.classList.add('lesson-item-title');
                lessonTitle.textContent = lesson.title;
                lessonTitle.addEventListener('click', () => loadLesson(lesson));
                
                const lessonActions = document.createElement('div');
                lessonActions.classList.add('lesson-actions');
                
                const deleteButton = document.createElement('button');
                deleteButton.classList.add('btn', 'btn-danger');
                deleteButton.textContent = 'X';
                deleteButton.addEventListener('click', (e) => {
                    e.stopPropagation();
                    deleteLesson(grade, subject, lesson.id);
                });
                
                lessonActions.appendChild(deleteButton);
                lessonItem.appendChild(lessonTitle);
                lessonItem.appendChild(lessonActions);
                subjectContent.appendChild(lessonItem);
            });
            
            subjectFolder.appendChild(subjectHeader);
            subjectFolder.appendChild(subjectContent);
            gradeContent.appendChild(subjectFolder);
        });
        
        gradeFolder.appendChild(gradeHeader);
        gradeFolder.appendChild(gradeContent);
        folderContainer.appendChild(gradeFolder);
    });
}