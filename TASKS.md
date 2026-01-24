# Natural Order - Tasks para Ralph Loop

## Instrucciones
Este archivo contiene las tareas pendientes para el desarrollo de Natural Order.
Marca las tareas como completadas cambiando `[ ]` por `[x]`.
Después de completar cada tarea, ejecuta los tests y verifica que la app funciona.

---

## Tareas Pendientes

### 1. [x] Fix: Listas de cartas colapsables en vista de trade
**Archivo:** `app/dashboard/matches/[id]/page.tsx`
**Problema:** Las listas de "Cartas que querés" y "Cartas que buscan" deberían empezar colapsadas pero se muestran expandidas.
**Verificación:**
- El estado inicial es `useState(false)` (líneas 381-382) pero no se aplica visualmente
- Probar navegando a `/dashboard/matches/[id]` y verificar que las listas empiezan colapsadas
- El click en el header debería expandir/colapsar
**Solución aplicada:** Se cambió de CSS (`max-h-0 opacity-0`) a renderizado condicional (`{expanded && ...}`) para garantizar que las listas solo se rendericen cuando están expandidas. Esto es más robusto que depender de CSS para ocultar contenido.

### 2. [ ] Fix: Match type incorrecto (Venta vs Compra)
**Archivo:** `app/api/matches/compute/route.ts`
**Problema:** El match_type se calcula antes de normalizar el orden de usuarios (líneas 420-426), causando que el tipo se muestre incorrectamente.
**Solución:** Mover la lógica de match_type DESPUÉS de la normalización de usuarios (línea 467), o ajustar el tipo según quién es user_a.
**Verificación:**
- Si tengo cartas en mi wishlist que otro tiene, debería mostrar "Compra"
- Si otro quiere cartas de mi colección y yo no quiero nada, debería mostrar "Venta"

### 3. [ ] Fix: Display name muestra "Usuario" en vez del nombre real
**Archivos:**
- `supabase/migrations/` (nueva migración)
- `app/api/matches/route.ts`
**Problema:** La RLS policy solo permite ver el propio perfil. La consulta de usuarios para matches falla silenciosamente.
**Solución:** Agregar policy que permita ver display_name de otros usuarios (SELECT limitado a campos públicos).
**Migración necesaria:**
```sql
CREATE POLICY "Anyone can view basic user info"
  ON public.users FOR SELECT
  USING (true)
  WITH CHECK (false);
-- O mejor, crear una view pública con solo campos necesarios
```

### 4. [ ] Fix: Quitar avatar "U" placeholder
**Archivo:** `app/dashboard/page.tsx`
**Problema:** Cuando no hay avatar, se muestra un círculo con "U" (líneas 761-775).
**Solución:** Mostrar la primera letra del displayName en vez de "U" genérico.
**Código actual:** `{match.otherUser.displayName.charAt(0).toUpperCase()}`
**Nota:** Ya está implementado pero si displayName es "Usuario", muestra "U". Se arregla con tarea #3.

### 5. [ ] Config: Habilitar verificación de email en Supabase
**Ubicación:** Supabase Dashboard > Authentication > Email Templates
**Problema:** Los usuarios nuevos pueden ingresar sin verificar su email.
**Solución:**
1. Ir a Authentication > Providers > Email
2. Habilitar "Confirm email"
3. Configurar el template de confirmación
**Verificación:** Al registrarse, debería aparecer pantalla de "Revisá tu email" y no poder entrar sin confirmar.

### 6. [ ] Fix: Setup indicator muestra pasos completados incorrectamente
**Archivo:** `app/dashboard/page.tsx`
**Problema:** El trigger de DB crea profile y preferences automáticamente, entonces setupStatus.profile y setupStatus.preferences son true para usuarios nuevos.
**Solución:** Cambiar la lógica de verificación:
- `profile`: Verificar que display_name NO sea el default (email prefix)
- `preferences`: Verificar que el usuario haya guardado preferencias explícitamente (agregar campo `has_been_configured` a preferences)
**Verificación:** Usuario nuevo debería ver todos los pasos como pendientes excepto los que configuró manualmente.

### 7. [ ] Feature: Implementar impacto de trade_mode en matches
**Archivos:**
- `app/api/matches/compute/route.ts`
- `app/dashboard/profile/page.tsx` (agregar explicaciones)
**Problema:** La preferencia trade_mode (trade/sell/both) no filtra los matches.
**Solución:**
1. Obtener preferencias del usuario y del otro usuario
2. Filtrar matches según compatibilidad:
   - trade only: solo mostrar two_way matches
   - sell only: mostrar matches donde yo vendo (one_way_sell o two_way)
   - both: mostrar todo
3. Agregar opción "buy only" (solo compra)
**Explicaciones a agregar en el form:**
- Solo trade: "Solo verás matches donde ambos intercambian cartas"
- Solo venta: "Verás oportunidades de vender tus cartas"
- Solo compra: "Verás oportunidades de comprar cartas que buscás"
- Ambos: "Verás todas las oportunidades de trade, compra y venta"

### 8. [ ] UI: Agregar explicación de trade modes en preferencias
**Archivo:** `app/dashboard/profile/page.tsx`
**Problema:** Las opciones de modo de intercambio no explican qué hacen.
**Solución:** Agregar texto descriptivo debajo de cada opción:
```tsx
{ value: 'trade', label: 'Solo trade', description: 'Solo matches de intercambio mutuo' },
{ value: 'sell', label: 'Solo venta', description: 'Oportunidades para vender cartas' },
{ value: 'buy', label: 'Solo compra', description: 'Oportunidades para comprar cartas' },
{ value: 'both', label: 'Todos', description: 'Trade, compra y venta' },
```

---

## Tests a ejecutar después de cada tarea

```bash
# Build para verificar errores de TypeScript
npm run build

# Tests E2E (si están configurados)
npm run test:e2e

# Verificación manual en browser
npm run dev
# Navegar a las páginas afectadas y verificar funcionalidad
```

---

## Notas para el desarrollador

- Antes de editar, leer el archivo completo para entender el contexto
- Usar `git diff` para verificar cambios antes de commitear
- Probar en mobile (responsive) además de desktop
- Si una tarea requiere migración de DB, crear archivo en `supabase/migrations/`
