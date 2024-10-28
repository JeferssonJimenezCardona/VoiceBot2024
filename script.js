document.addEventListener('DOMContentLoaded', async () => {
    let recognition;
    let synthesis;
    let isInteractionActive = false;
    let isListening = false;
    let conversationHistory = [];
    // const OPENAI_API_KEY = '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'; // Reemplaza con tu clave API de OpenAI
    // const OPENAI_API_KEY = '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'; // Reemplaza con tu clave API de OpenAI
    const AZURE_API_KEY = '347b62daab7645d2890e4aaaaede244e'; // Reemplaza con tu clave API de Azure OpenAI
    const AZURE_URL = 'https://labgenai.openai.azure.com/openai/deployments/azureopenai/chat/completions?api-version=2024-02-15-preview';




    const startInteractionBtn = document.getElementById('start-interaction');
    const stopInteractionBtn = document.getElementById('stop-interaction');
    const toggleMicBtn = document.getElementById('toggle-mic');
    const exportConversationBtn = document.getElementById('export-conversation');
    const analyzeConversationBtn = document.getElementById('analyze-conversation');
    const callControls = document.getElementById('call-controls');
    const interactionArea = document.getElementById('interaction-area');
    const interactionActions = document.getElementById('interaction-actions');
    const analysisResults = document.getElementById('analysis-results');
    const clientSelect = document.getElementById('client-select');
    const clientDetails = document.getElementById('client-details');

    const cobranzaContexto = `
    Eres Emma, un asistente virtual de cobranza masculino para una empresa de telecomunicaciones llamada Indra. Tu tarea es realizar una llamada a un usuario que tiene una deuda pendiente de cien Pesos Colombianos en su factura. El número de factura termina en 98. Tus objetivos son:

    1. Saludar al cliente de manera amable y profesional, identificándote como Emma de Indra.
    2. Informar sobre el saldo vencido de cien Pesos Colombianos en la factura terminada en 98.
    3. Entender la situación financiera del cliente.
    4. Ofrecer opciones de pago flexibles para regularizar la cuenta.
    5. Llegar a un acuerdo de pago beneficioso para ambas partes.
    6. Si el usuario se desvía del contexto o te hace preguntas no éticas o de información general, indícale que no puedes ayudarle a responder esa pregunta.
    7. Utiliza el vocabulario propio del Perú y ajusta el estilo de acuerdo con el acento característico de Lima
    8. Quiero que la voz sintética suene más fluida y natural, evitando pausas excesivas en los puntos y leyendo los números de manera más conversacional. Ajusta la velocidad para que no sea ni demasiado rápida ni lenta, y usa la entonación de manera que la conversación fluya mejor. También, si es posible, evita que los puntos detengan demasiado el ritmo, prefiriendo una lectura continua, incluso para los números
    9. Evita repetir el nombre con frecuencia. Te comparto 1 ejemplo de referencia,en lugar de decir 'Emma: Entiendo, señor LUIS GUILLERMO PARDO. Antes de que cuelgue', sería más natural decir simplemente: 'Entiendo, antes de que cuelgue'.
    Mantén siempre un tono amable y profesional. Haz que el usuario se sienta respaldado durante toda la conversación. Ofrece empatía y comprensión, pero sé firme en la necesidad de resolver la deuda.

    Algunas opciones de pago que puedes ofrecer incluyen:
    - Plan de pagos en cuotas
    - Descuento por pago inmediato
    - Condonación de intereses si se paga un porcentaje significativo de la deuda

    Adapta tus respuestas según la disposición y situación del cliente. Si el cliente se muestra cooperativo, sé más flexible. Si se muestra reacio, sé más persuasivo pero siempre respetuoso.

    IMPORTANTE: Tus respuestas deben ser naturales y directas. No uses etiquetas como "Asistente:" al inicio de tus mensajes. Habla como lo haría un representante de cobranza real.
    Utiliza el vocabulario propio del Perú y ajusta el estilo de acuerdo con el acento característico de Lima
    `;

    const clientes = [
        { id: 1, nombre: "Luis Guillermo Pardo", tipologia: "Jurídica", deuda: 100 },
        { id: 2, nombre: "Iovania Peñaloza Caicedo", tipologia: "Administrativa", deuda: 200 },
        { id: 3, nombre: "Carlos Gómez", tipologia: "Jurídica", deuda: 300 },
        { id: 4, nombre: "Ana Martínez", tipologia: "Administrativa", deuda: 100 },
        { id: 5, nombre: "Pedro Sánchez", tipologia: "Jurídica", deuda: 100 },
        { id: 6, nombre: "Laura Torres", tipologia: "Administrativa", deuda: 500 },
        { id: 7, nombre: "Juan Pérez", tipologia: "Jurídica", deuda: 100 },
        { id: 8, nombre: "Sofia López", tipologia: "Administrativa", deuda: 800 },
        { id: 9, nombre: "Diego Fernández", tipologia: "Jurídica", deuda: 100 },
        { id: 10, nombre: "Elena Díaz", tipologia: "Administrativa", deuda: 50 }
    ];
//-----------------------------
    initSpeechRecognition();
    initClientList();

    startInteractionBtn.addEventListener('click', startInteraction);
    stopInteractionBtn.addEventListener('click', stopInteraction);
    toggleMicBtn.addEventListener('click', toggleMicrophone);
    exportConversationBtn.addEventListener('click', exportConversation);
    analyzeConversationBtn.addEventListener('click', analyzeConversation);
    clientSelect.addEventListener('change', updateClientDetails);

    function initSpeechRecognition() {
        recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.lang = 'es-ES';
        recognition.interimResults = true;
        recognition.continuous = true;

        recognition.onresult = async (event) => {
            if (!isListening) return;
            const result = event.results[event.results.length - 1];
            if (result.isFinal) {
                const userMessage = result[0].transcript;
                addMessage('Cliente: ' + userMessage, 'user-message');
                await processUserInput(userMessage);
            }
        };

        recognition.onerror = (event) => {
            console.error('Error en el reconocimiento de voz:', event.error);
            if (event.error === 'no-speech' && isListening) {
                console.log('No se detectó voz. Reiniciando el reconocimiento...');
                startListening();
            }
        };

        recognition.onend = () => {
            if (isListening) {
                startListening();
            }
        };
    }

    function initClientList() {
        clientes.forEach(cliente => {
            const option = document.createElement('option');
            option.value = cliente.id;
            option.textContent = cliente.nombre;
            clientSelect.appendChild(option);
        });
    }

    function updateClientDetails() {
        const selectedClientId = clientSelect.value;
        const selectedClient = clientes.find(cliente => cliente.id == selectedClientId);
        if (selectedClient) {
            clientDetails.innerHTML = `
                <p><strong>Nombre:</strong> ${selectedClient.nombre}</p>
                <p><strong>Tipología:</strong> ${selectedClient.tipologia}</p>
                <p><strong>Deuda:</strong> ${selectedClient.deuda.toLocaleString()}</p>
            `;
        } else {
            clientDetails.innerHTML = '';
        }
    }

    function startInteraction() {
        isInteractionActive = true;
        callControls.classList.add('hidden');
        interactionArea.classList.remove('hidden');
        interactionActions.classList.remove('hidden');
        iniciarLlamada();
    }

    function stopInteraction() {
        isInteractionActive = false;
        isListening = false;
        callControls.classList.remove('hidden');
        interactionArea.classList.add('hidden');
        interactionActions.classList.add('hidden');
        stopListening();
        responsiveVoice.cancel();
    }

    function startListening() {
        if (!isListening) {
            isListening = true;
            toggleMicBtn.classList.add('listening');
            recognition.start();
        }
    }

    function stopListening() {
        if (isListening) {
            isListening = false;
            toggleMicBtn.classList.remove('listening');
            recognition.stop();
        }
    }

    function toggleMicrophone() {
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    }

    function addMessage(message, className) {
        const messageElement = document.createElement('p');
        messageElement.textContent = message;
        messageElement.classList.add(className);
        interactionArea.appendChild(messageElement);
        interactionArea.scrollTop = interactionArea.scrollHeight;
        conversationHistory.push(message);
    }
    // Spanish Latin American Male
    async function speak(text) {
        return new Promise((resolve) => {
            responsiveVoice.speak(text, "Spanish Latin American Male", {
                pitch: 0,// Tono de la voz: 1 es neutral, valores más altos agudizan la voz, y valores más bajos la hacen más grave.
                rate: 1.3, // Velocidad de la voz: 1 es la velocidad normal, valores más bajos la hacen más lenta, y valores más altos más rápida.
                volume: 1, // Volumen de la voz: 1 es el volumen máximo, 0 es silencio.
                onend: resolve// Callback que se ejecuta cuando la voz termina de hablar.
            });
        });
    }

    async function processUserInput(input) {
        stopListening();
        toggleMicBtn.classList.add('processing');

        const response = await generateAIResponse(input);

        addMessage('Emma: ' + response, 'ai-message');
        await speak(response);

        await new Promise(resolve => setTimeout(resolve, 1000));

        toggleMicBtn.classList.remove('processing');
        if (isInteractionActive) {
            startListening();
        }
    }

    async function generateAIResponse(input) {
        try {
            const response = await fetch(AZURE_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'api-key': AZURE_API_KEY // Azure usa 'api-key' en lugar de 'Authorization'
                },
                body: JSON.stringify({
                    model: "gpt-4o", // Asegúrate de usar el modelo que tienes desplegado en Azure
                    messages: [
                        { role: "system", content: cobranzaContexto },
                        ...conversationHistory.map(msg => {
                            const [role, content] = msg.split(': ');
                            return {
                                role: role === 'Cliente' ? 'user' : 'assistant',
                                content
                            };
                        }),
                        { role: "user", content: input }
                    ],
                    max_tokens: 200,
                    temperature: 0.1
                })
            });
    
            const data = await response.json();
            return data.choices[0].message.content.trim();
        } catch (error) {
            console.error('Error al generar la respuesta de IA:', error);
            return "Disculpe, parece que tenemos un problema técnico. ¿Podría repetir su última declaración, por favor?";
        }
    }

    async function iniciarLlamada() {
        const selectedClientId = clientSelect.value;
        const selectedClient = clientes.find(cliente => cliente.id == selectedClientId);
        if (!selectedClient) {
            alert("Por favor, seleccione un cliente antes de iniciar la llamada.");
            stopInteraction();
            return;
        }

        const saludoInicial = `Hola ${selectedClient.nombre}, un gusto en saludarlo. Le habla Emma, asistente virtual de Indra. Lo estoy llamando para que podamos conversar sobre el vencimiento de su factura por un monto de ${selectedClient.deuda.toLocaleString()} Pesos Colombianos.`;
        addMessage('Emma: ' + saludoInicial, 'ai-message');
        await speak(saludoInicial);
        startListening();
    }
    //-----------------------------

    function exportConversation() {
        const blob = new Blob([conversationHistory.join('\n')], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'registro_llamada_cobranza.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    async function analyzeConversation() {
        const conversationText = conversationHistory.join(' ');

        // Simulamos los resultados del análisis
        // const sentimentResult = Math.random() > 0.5 ? 'Positivo' : 'Negativo';
        // const emotions = ['Alegría', 'Tristeza', 'Enojo', 'Miedo', 'Sorpresa'];
        const sentimentOptions = ['Positivo', 'Negativo', 'Neutral'];
        const sentimentResult = sentimentOptions[Math.floor(Math.random() * sentimentOptions.length)];
        const emotions = [
            'Alegría',
            'Tristeza',
            'Enojo',
            'Miedo',
            'Sorpresa',
            'Frustración', // Común en interacciones de call center
            'Empatía', // Refleja comprensión y conexión emocional
            'Calma' // Emoción deseada en situaciones tensas
        ];

        const dominantEmotion = emotions[Math.floor(Math.random() * emotions.length)];
        const negotiationScore = Math.floor(Math.random() * 101);

        document.getElementById('sentiment-result').textContent = `Sentimiento: ${sentimentResult}`;
        document.getElementById('emotions-result').textContent = `Emoción dominante: ${dominantEmotion}`;
        document.getElementById('negotiation-result').textContent = `Indicador de negociación: ${negotiationScore}/100`;

        analysisResults.classList.remove('hidden');
    }
    const analyzeTextBtn = document.getElementById('analyze-text');
analyzeTextBtn.addEventListener('click', analyzeText);

function analyzeText() {
    const conversationText = conversationHistory.join(' ');
    const wordCount = countWords(conversationText);
    const tokenCount = estimateTokens(conversationText);
    const cost = calculateCost(tokenCount);

    const analysisResultsDiv = document.createElement('div');
    analysisResultsDiv.id = 'text-analysis-results';
    analysisResultsDiv.innerHTML = `
        <h3>Costos Estimados de la llamada</h3>
        <p>Número total de palabras: ${wordCount}</p>
        <p>Número estimado de tokens: ${tokenCount}</p>
        <p>Costo estimado: $${cost.toFixed(4)}</p>
    `;

    const existingResults = document.getElementById('text-analysis-results');
    if (existingResults) {
        existingResults.remove();
    }

    document.getElementById('interaction').appendChild(analysisResultsDiv);
}

function countWords(text) {
    return text.trim().split(/\s+/).length;
}

function estimateTokens(text) {
    // Esta es una estimación aproximada. Los tokens reales pueden variar.
    return Math.ceil(text.length / 4);
}

function calculateCost(tokenCount) {
    const ratePerThousandTokens = 0.0250;
    return (tokenCount / 1000) * ratePerThousandTokens;
}
    
});