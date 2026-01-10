/**
 * Natural Order - Waitlist Form Handler
 * Conecta con Supabase para guardar respuestas del formulario
 */

// ============================================
// CONFIGURACIÓN DE SUPABASE
// ============================================
const SUPABASE_URL = 'https://yytguwptqcdnmglinbvw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5dGd1d3B0cWNkbm1nbGluYnZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwMDQ1MjQsImV4cCI6MjA4MzU4MDUyNH0.us4rseaLqAUF_zweerdGoMJl1TFniJPerl4Yl1jEkfA';

// ============================================
// ESTADO DEL FORMULARIO
// ============================================
let currentStep = 1;
const totalSteps = 6;
const MAX_CHECKBOX_SELECTIONS = 2;

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

function updateProgress() {
    const progress = (currentStep / totalSteps) * 100;
    progressBar.style.width = `${progress}%`;
    progressText.textContent = `Paso ${currentStep} de ${totalSteps}`;
}

function updateButtons() {
    if (currentStep === 1) {
        prevBtn.classList.add('hidden');
    } else {
        prevBtn.classList.remove('hidden');
    }

    if (currentStep === totalSteps) {
        nextBtn.classList.add('hidden');
        submitBtn.classList.remove('hidden');
    } else {
        nextBtn.classList.remove('hidden');
        submitBtn.classList.add('hidden');
    }
}

function validateCurrentStep() {
    const currentStepEl = document.querySelector(`[data-step="${currentStep}"]`);

    // Validar inputs de texto requeridos
    const textInputs = currentStepEl.querySelectorAll('input[type="text"][required], input[type="email"][required]');
    for (const input of textInputs) {
        if (!input.value.trim()) {
            showError('Por favor, completá todos los campos.');
            input.focus();
            return false;
        }
        if (input.type === 'email' && !isValidEmail(input.value)) {
            showError('Por favor, ingresá un email válido.');
            input.focus();
            return false;
        }
    }

    // Validar radio buttons requeridos
    const radioGroups = new Set();
    currentStepEl.querySelectorAll('input[type="radio"][required]').forEach(r => radioGroups.add(r.name));

    for (const groupName of radioGroups) {
        const isChecked = currentStepEl.querySelector(`input[name="${groupName}"]:checked`);
        if (!isChecked) {
            showError('Por favor, seleccioná una opción para continuar.');
            return false;
        }
    }

    // Validar checkboxes (al menos 1 seleccionado para grupos de checkbox)
    if (currentStep === 2) {
        const searchMethods = currentStepEl.querySelectorAll('input[name="search_methods"]:checked');
        if (searchMethods.length === 0) {
            showError('Por favor, seleccioná al menos un método de búsqueda.');
            return false;
        }
    }

    if (currentStep === 4) {
        const frictionReasons = currentStepEl.querySelectorAll('input[name="friction_reasons"]:checked');
        if (frictionReasons.length === 0) {
            showError('Por favor, seleccioná al menos una razón de fricción.');
            return false;
        }
    }

    hideError();
    return true;
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function nextStep() {
    if (!validateCurrentStep()) return;

    if (currentStep < totalSteps) {
        currentStep++;
        showStep(currentStep);
    }
}

function prevStep() {
    if (currentStep > 1) {
        currentStep--;
        showStep(currentStep);
    }
}

// ============================================
// FUNCIONES DE UI
// ============================================

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
    form.classList.add('shake');
    setTimeout(() => form.classList.remove('shake'), 500);
}

function hideError() {
    errorMessage.classList.add('hidden');
}

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

function showSuccess() {
    document.querySelectorAll('.form-step').forEach(el => el.classList.add('hidden'));
    formNavigation.classList.add('hidden');
    document.querySelector('.mb-8').classList.add('hidden');
    successMessage.classList.remove('hidden');
}

// ============================================
// CHECKBOX LIMIT LOGIC
// ============================================

function setupCheckboxLimit(groupName, maxSelections) {
    const checkboxes = document.querySelectorAll(`input[name="${groupName}"]`);

    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            const checked = document.querySelectorAll(`input[name="${groupName}"]:checked`);

            if (checked.length >= maxSelections) {
                // Deshabilitar los no seleccionados
                checkboxes.forEach(cb => {
                    if (!cb.checked) {
                        cb.closest('.checkbox-card').classList.add('disabled');
                    }
                });
            } else {
                // Habilitar todos
                checkboxes.forEach(cb => {
                    cb.closest('.checkbox-card').classList.remove('disabled');
                });
            }

            hideError();
        });
    });
}

// ============================================
// CONDITIONAL "OTHER" FIELDS
// ============================================

function setupConditionalField(triggerCheckboxId, textFieldId) {
    const trigger = document.getElementById(triggerCheckboxId);
    const textField = document.getElementById(textFieldId);

    if (trigger && textField) {
        trigger.addEventListener('change', () => {
            if (trigger.checked) {
                textField.classList.remove('hidden');
                textField.focus();
            } else {
                textField.classList.add('hidden');
                textField.value = '';
            }
        });
    }
}

function setupConditionalRadioField(radioId, textFieldId) {
    const radio = document.getElementById(radioId);
    const textField = document.getElementById(textFieldId);
    const radioGroup = radio ? radio.name : null;

    if (radio && textField && radioGroup) {
        document.querySelectorAll(`input[name="${radioGroup}"]`).forEach(r => {
            r.addEventListener('change', () => {
                if (radio.checked) {
                    textField.classList.remove('hidden');
                    textField.focus();
                } else {
                    textField.classList.add('hidden');
                    textField.value = '';
                }
            });
        });
    }
}

// ============================================
// SUPABASE
// ============================================

async function submitToSupabase(formData) {
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

function getCheckedValues(name) {
    return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`))
        .map(cb => cb.value);
}

function collectFormData() {
    const searchMethods = getCheckedValues('search_methods');
    const frictionReasons = getCheckedValues('friction_reasons');

    return {
        email: document.getElementById('email').value.trim().toLowerCase(),
        country_city: document.getElementById('country_city').value.trim(),

        search_methods: searchMethods,
        search_methods_other: document.getElementById('search_methods_other')?.value.trim() || null,

        trades_frequency: document.querySelector('input[name="trades_frequency"]:checked')?.value,
        wishlist_size: document.querySelector('input[name="wishlist_size"]:checked')?.value,

        coordination_pain: parseInt(document.querySelector('input[name="coordination_pain"]:checked')?.value),

        friction_reasons: frictionReasons,
        friction_reasons_other: document.getElementById('friction_reasons_other')?.value.trim() || null,

        would_use_app: document.querySelector('input[name="would_use_app"]:checked')?.value,
        would_use_app_no_reason: document.getElementById('would_use_app_no_reason')?.value.trim() || null,

        monetization_preference: document.querySelector('input[name="monetization_preference"]:checked')?.value,
        annual_spending: document.querySelector('input[name="annual_spending"]:checked')?.value,

        created_at: new Date().toISOString()
    };
}

// ============================================
// EVENT LISTENERS
// ============================================

nextBtn.addEventListener('click', nextStep);
prevBtn.addEventListener('click', prevStep);

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

form.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.type !== 'submit') {
        e.preventDefault();
        if (currentStep < totalSteps) {
            nextStep();
        }
    }
});

document.querySelectorAll('.radio-card input, .checkbox-card input').forEach(input => {
    input.addEventListener('change', () => {
        hideError();
    });
});

// ============================================
// INICIALIZACIÓN
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    showStep(1);

    // Setup checkbox limits (max 2 selections)
    setupCheckboxLimit('search_methods', MAX_CHECKBOX_SELECTIONS);
    setupCheckboxLimit('friction_reasons', MAX_CHECKBOX_SELECTIONS);

    // Setup conditional "other" fields
    setupConditionalField('search_methods_otro', 'search_methods_other');
    setupConditionalField('friction_reasons_otro', 'friction_reasons_other');
    setupConditionalRadioField('would_use_app_no', 'would_use_app_no_reason');
});
