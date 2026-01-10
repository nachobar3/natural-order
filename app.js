/**
 * Natural Order - Waitlist Form Handler
 * Conecta con Supabase para guardar respuestas del formulario
 */

// ============================================
// CONFIGURACIÓN DE SUPABASE
// Reemplazar estos valores con los de tu proyecto
// ============================================
const SUPABASE_URL = 'https://yytguwptqcdnmglinbvw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5dGd1d3B0cWNkbm1nbGluYnZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwMDQ1MjQsImV4cCI6MjA4MzU4MDUyNH0.us4rseaLqAUF_zweerdGoMJl1TFniJPerl4Yl1jEkfA';

// ============================================
// ESTADO DEL FORMULARIO
// ============================================
let currentStep = 1;
const totalSteps = 5;

// ============================================
// ELEMENTOS DEL DOM
// ============================================
const form = document.getElementById('waitlist-form');
const progressBar = document.getElementById('progress-bar');
const progressText = document.getElementById('progress-text');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const submitBtn = document.getElementById('submit-btn');
const errorMessage = document.getElementById('error-message');
const successMessage = document.getElementById('success-message');
const formNavigation = document.getElementById('form-navigation');

// ============================================
// FUNCIONES DE NAVEGACIÓN
// ============================================

/**
 * Muestra el paso actual y oculta los demás
 */
function showStep(step) {
    document.querySelectorAll('.form-step').forEach(el => {
        el.classList.add('hidden');
    });

    const currentStepEl = document.querySelector(`[data-step="${step}"]`);
    if (currentStepEl) {
        currentStepEl.classList.remove('hidden');
    }

    updateProgress();
    updateButtons();
}

/**
 * Actualiza la barra de progreso
 */
function updateProgress() {
    const progress = (currentStep / totalSteps) * 100;
    progressBar.style.width = `${progress}%`;
    progressText.textContent = `Paso ${currentStep} de ${totalSteps}`;
}

/**
 * Actualiza visibilidad de botones según el paso
 */
function updateButtons() {
    // Botón anterior
    if (currentStep === 1) {
        prevBtn.classList.add('hidden');
    } else {
        prevBtn.classList.remove('hidden');
    }

    // Botón siguiente vs submit
    if (currentStep === totalSteps) {
        nextBtn.classList.add('hidden');
        submitBtn.classList.remove('hidden');
    } else {
        nextBtn.classList.remove('hidden');
        submitBtn.classList.add('hidden');
    }
}

/**
 * Valida el paso actual antes de avanzar
 */
function validateCurrentStep() {
    const currentStepEl = document.querySelector(`[data-step="${currentStep}"]`);
    const requiredInputs = currentStepEl.querySelectorAll('input[required]');

    for (const input of requiredInputs) {
        if (input.type === 'radio') {
            const radioGroup = currentStepEl.querySelectorAll(`input[name="${input.name}"]`);
            const isChecked = Array.from(radioGroup).some(r => r.checked);
            if (!isChecked) {
                showError('Por favor, seleccioná una opción para continuar.');
                return false;
            }
        } else if (!input.value.trim()) {
            showError('Por favor, completá todos los campos.');
            input.focus();
            return false;
        } else if (input.type === 'email' && !isValidEmail(input.value)) {
            showError('Por favor, ingresá un email válido.');
            input.focus();
            return false;
        }
    }

    hideError();
    return true;
}

/**
 * Validación simple de email
 */
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Avanza al siguiente paso
 */
function nextStep() {
    if (!validateCurrentStep()) return;

    if (currentStep < totalSteps) {
        currentStep++;
        showStep(currentStep);
    }
}

/**
 * Retrocede al paso anterior
 */
function prevStep() {
    if (currentStep > 1) {
        currentStep--;
        showStep(currentStep);
    }
}

// ============================================
// FUNCIONES DE UI
// ============================================

/**
 * Muestra mensaje de error
 */
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
    form.classList.add('shake');
    setTimeout(() => form.classList.remove('shake'), 500);
}

/**
 * Oculta mensaje de error
 */
function hideError() {
    errorMessage.classList.add('hidden');
}

/**
 * Muestra estado de carga en botón submit
 */
function setLoading(isLoading) {
    if (isLoading) {
        submitBtn.disabled = true;
        submitBtn.classList.add('loading');
        submitBtn.textContent = 'Enviando...';
    } else {
        submitBtn.disabled = false;
        submitBtn.classList.remove('loading');
        submitBtn.textContent = 'Unirme a la waitlist';
    }
}

/**
 * Muestra mensaje de éxito
 */
function showSuccess() {
    document.querySelectorAll('.form-step').forEach(el => el.classList.add('hidden'));
    formNavigation.classList.add('hidden');
    document.querySelector('.mb-8').classList.add('hidden'); // Progress bar
    successMessage.classList.remove('hidden');
}

// ============================================
// SUPABASE
// ============================================

/**
 * Envía los datos a Supabase
 */
async function submitToSupabase(formData) {
    // Verificar configuración
    if (SUPABASE_URL === 'TU_SUPABASE_URL' || SUPABASE_ANON_KEY === 'TU_SUPABASE_ANON_KEY') {
        console.warn('⚠️ Supabase no está configurado. Los datos se mostrarán en consola.');
        console.log('Datos del formulario:', formData);
        return { success: true, demo: true };
    }

    const response = await fetch(`${SUPABASE_URL}/rest/v1/waitlist_responses`, {
        method: 'POST',
        headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
        },
        body: JSON.stringify(formData)
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al guardar los datos');
    }

    return { success: true };
}

/**
 * Recolecta todos los datos del formulario
 */
function collectFormData() {
    return {
        email: document.getElementById('email').value.trim().toLowerCase(),
        trades_frequency: document.querySelector('input[name="trades_frequency"]:checked')?.value,
        search_method: document.querySelector('input[name="search_method"]:checked')?.value,
        coordination_pain: parseInt(document.querySelector('input[name="coordination_pain"]:checked')?.value),
        abandoned_trade: document.querySelector('input[name="abandoned_trade"]:checked')?.value === 'true',
        would_use_app: document.querySelector('input[name="would_use_app"]:checked')?.value,
        most_valuable_benefit: document.querySelector('input[name="most_valuable_benefit"]:checked')?.value,
        monetization_preference: document.querySelector('input[name="monetization_preference"]:checked')?.value,
        created_at: new Date().toISOString()
    };
}

// ============================================
// EVENT LISTENERS
// ============================================

// Navegación con botones
nextBtn.addEventListener('click', nextStep);
prevBtn.addEventListener('click', prevStep);

// Submit del formulario
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!validateCurrentStep()) return;

    setLoading(true);
    hideError();

    try {
        const formData = collectFormData();
        const result = await submitToSupabase(formData);

        if (result.demo) {
            console.log('✅ Modo demo: datos mostrados en consola');
        }

        showSuccess();

    } catch (error) {
        console.error('Error:', error);

        if (error.message.includes('duplicate') || error.message.includes('unique')) {
            showError('Este email ya está registrado en la waitlist.');
        } else {
            showError('Hubo un error al procesar tu solicitud. Por favor, intentá de nuevo.');
        }
    } finally {
        setLoading(false);
    }
});

// Navegación con teclado (Enter para avanzar)
form.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.type !== 'submit') {
        e.preventDefault();
        if (currentStep < totalSteps) {
            nextStep();
        }
    }
});

// Feedback visual al seleccionar radio buttons
document.querySelectorAll('.radio-card input').forEach(input => {
    input.addEventListener('change', () => {
        hideError();
    });
});

// ============================================
// INICIALIZACIÓN
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    showStep(1);
});
