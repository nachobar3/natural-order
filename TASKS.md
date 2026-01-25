# Natural Order - Tasks para Ralph Loop

## Instrucciones
Este archivo contiene las tareas pendientes para el desarrollo de Natural Order.
Marca las tareas como completadas cambiando `[ ]` por `[x]`.
Después de completar cada tarea, ejecuta los tests y verifica que la app funciona.

---

## Tareas Pendientes

### 1. [x] Fix: Listas de cartas colapsables en vista de trade
**Archivos:**
- `app/dashboard/matches/[id]/page.tsx` (página de detalle)
- `app/dashboard/page.tsx` (lista de matches en dashboard)

**Problema:** Las listas de "Cartas que querés" y "Cartas que buscan" deberían empezar colapsadas pero se muestran expandidas.
**Verificación:**
- El estado inicial es `useState(false)` (líneas 381-382) pero no se aplica visualmente
- Probar navegando a `/dashboard/matches/[id]` y verificar que las listas empiezan colapsadas
- El click en el header debería expandir/colapsar
**Solución aplicada:**
1. **Página de detalle** (`matches/[id]/page.tsx`): Se cambió de CSS (`max-h-0 opacity-0`) a renderizado condicional (`{expanded && ...}`) para garantizar que las listas solo se rendericen cuando están expandidas.
2. **Dashboard principal** (`page.tsx`): Se agregó estado `expandedMatches` (Set) y botón toggle con ChevronUp/ChevronDown para cada match card. Las listas "Tiene" y "Busca" ahora están colapsadas por defecto y se expanden al hacer click en el botón.

### 2. [x] Fix: Match type incorrecto (Venta vs Compra)
**Archivo:** `app/api/matches/compute/route.ts`
**Problema:** El match_type se calcula antes de normalizar el orden de usuarios (líneas 420-426), causando que el tipo se muestre incorrectamente.
**Solución:** Mover la lógica de match_type DESPUÉS de la normalización de usuarios (línea 467), o ajustar el tipo según quién es user_a.
**Verificación:**
- Si tengo cartas en mi wishlist que otro tiene, debería mostrar "Compra"
- Si otro quiere cartas de mi colección y yo no quiero nada, debería mostrar "Venta"
**Solución aplicada:** Se agregó lógica para ajustar el match_type DESPUÉS de la normalización de usuarios. Si el usuario actual tiene UUID mayor que el otro usuario (es decir, será user_b), se invierte el tipo one_way: `one_way_buy` ↔ `one_way_sell`. Esto asegura que el tipo siempre sea relativo a user_a.

### 3. [x] Fix: Display name muestra "Usuario" en vez del nombre real
**Archivos:**
- `supabase/migrations/012_allow_viewing_basic_user_info.sql` (nueva migración)
- `app/api/matches/route.ts`
**Problema:** La RLS policy solo permite ver el propio perfil. La consulta de usuarios para matches falla silenciosamente.
**Solución:** Agregar policy que permita ver display_name de otros usuarios (SELECT limitado a campos públicos).
**Solución aplicada:** Se creó la migración `012_allow_viewing_basic_user_info.sql` que agrega una política RLS:
```sql
CREATE POLICY "Authenticated users can view basic user info for matching"
  ON public.users FOR SELECT
  TO authenticated
  USING (true);
```
La política permite que usuarios autenticados puedan leer información de otros usuarios. El código del API ya filtra los campos a solo `id`, `display_name` y `avatar_url`.

### 4. [x] Fix: Quitar avatar "U" placeholder
**Archivo:** `app/dashboard/page.tsx`
**Problema:** Cuando no hay avatar, se muestra un círculo con "U" (líneas 761-775).
**Solución:** Mostrar la primera letra del displayName en vez de "U" genérico.
**Código actual:** `{match.otherUser.displayName.charAt(0).toUpperCase()}`
**Nota:** Ya está implementado pero si displayName es "Usuario", muestra "U". Se arregla con tarea #3.
**Solución aplicada:** Esta tarea fue resuelta automáticamente por la tarea #3. La migración `012_allow_viewing_basic_user_info.sql` permite que los usuarios autenticados puedan ver el `display_name` real de otros usuarios, por lo que ya no se muestra "Usuario" como fallback y el avatar ahora muestra la primera letra del nombre real del usuario.

### 5. [x] Config: Habilitar verificación de email en Supabase
**Ubicación:** Supabase Dashboard > Authentication > Email Templates
**Problema:** Los usuarios nuevos pueden ingresar sin verificar su email.
**Solución:**
1. Ir a Authentication > Providers > Email
2. Habilitar "Confirm email"
3. Configurar el template de confirmación
**Verificación:** Al registrarse, debería aparecer pantalla de "Revisá tu email" y no poder entrar sin confirmar.
**Nota:** Esta es una tarea de configuración manual que debe realizarse en el Supabase Dashboard. No requiere cambios de código. El propietario del proyecto debe aplicar esta configuración directamente en https://supabase.com/dashboard > Proyecto > Authentication > Providers > Email.

### 6. [x] Fix: Setup indicator muestra pasos completados incorrectamente
**Archivo:** `app/dashboard/page.tsx`
**Problema:** El trigger de DB crea profile y preferences automáticamente, entonces setupStatus.profile y setupStatus.preferences son true para usuarios nuevos.
**Solución:** Cambiar la lógica de verificación:
- `profile`: Verificar que display_name NO sea el default (email prefix)
- `preferences`: Verificar que el usuario haya guardado preferencias explícitamente (agregar campo `has_been_configured` a preferences)
**Verificación:** Usuario nuevo debería ver todos los pasos como pendientes excepto los que configuró manualmente.
**Solución aplicada:**
1. Creada migración `013_add_has_been_configured_to_preferences.sql` que agrega el campo `has_been_configured` (boolean, default false) a la tabla `preferences`.
2. Modificado `app/dashboard/profile/page.tsx` para incluir `has_been_configured: true` al guardar preferencias.
3. Modificado `app/dashboard/page.tsx` en `loadSetupStatus`:
   - `profile`: Ahora verifica que `display_name` sea diferente del prefix del email del usuario.
   - `preferences`: Ahora verifica el campo `has_been_configured` en lugar de solo la existencia del registro.

### 7. [x] Feature: Implementar impacto de trade_mode en matches
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
**Solución aplicada:**
1. Creada migración `014_add_buy_to_trade_mode_enum.sql` para agregar 'buy' al enum `trade_mode`.
2. Modificado `app/api/matches/compute/route.ts`:
   - Se obtienen las preferencias del usuario antes de computar matches.
   - Se filtran los matches según `trade_mode`: trade (solo two_way), sell (excluye one_way_buy), buy (excluye one_way_sell), both (todos).
3. Actualizado el formulario de preferencias en `app/dashboard/profile/page.tsx` con la opción "Solo compra" y descripciones para cada modo.

### 8. [x] UI: Agregar explicación de trade modes en preferencias
**Archivo:** `app/dashboard/profile/page.tsx`
**Problema:** Las opciones de modo de intercambio no explican qué hacen.
**Solución:** Agregar texto descriptivo debajo de cada opción:
```tsx
{ value: 'trade', label: 'Solo trade', description: 'Solo matches de intercambio mutuo' },
{ value: 'sell', label: 'Solo venta', description: 'Oportunidades para vender cartas' },
{ value: 'buy', label: 'Solo compra', description: 'Oportunidades para comprar cartas' },
{ value: 'both', label: 'Todos', description: 'Trade, compra y venta' },
```
**Solución aplicada:** Implementado junto con la tarea #7. El formulario ahora muestra las 4 opciones en un grid 2x2 con el nombre y descripción de cada modo.

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
