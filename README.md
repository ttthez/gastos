# Gastos

App minimalista de control de gastos personales. Funciona 100% en el navegador, sin servidor ni base de datos: los datos quedan guardados en tu celular.

## Qué hace

- **Cargar un gasto en 3 toques**: botón `+` → monto → categoría → Guardar.
- **Categorías** con emoji: Súper, Salir a comer, Café, Transporte, Regalos, Ocio, Ropa, Salud, Hogar, Servicios, Suscripción, Gym, Viajes, Mascotas, Educación, Otros.
- **Gastos fijos** (gym, Netflix, alquiler…): se cargan una vez y se suman solos todos los meses. Podés marcar cuáles ya pagaste en el mes.
- **Resumen mensual**: total, variables vs. fijos y barras por categoría. Cambiás de mes con las flechas.
- **Tocá un gasto** para editarlo o eliminarlo.
- **Copia de seguridad**: exportar/importar JSON y exportar el mes a CSV (abre en Excel / Google Sheets).
- Se instala como app en el celular y funciona sin internet.

## Publicarla gratis con GitHub Pages

1. Creá un repo nuevo en GitHub (por ejemplo `gastos`) y subí estos archivos:
   ```bash
   git remote add origin https://github.com/TU-USUARIO/gastos.git
   git push -u origin main
   ```
   (O desde la web: *Add file → Upload files* y arrastrás todo.)
2. En el repo: **Settings → Pages → Source: Deploy from a branch → `main` / `(root)` → Save**.
3. En 1–2 minutos queda en `https://TU-USUARIO.github.io/gastos/`.

## Instalarla en el celular

- **iPhone (Safari)**: abrí el link → botón Compartir → *Agregar a pantalla de inicio*.
- **Android (Chrome)**: abrí el link → menú ⋮ → *Instalar app* / *Agregar a pantalla principal*.

## Importante sobre tus datos

Los gastos se guardan en el almacenamiento local del navegador de **ese** dispositivo. No se sincronizan entre celular y compu, y si borrás los datos del navegador se pierden. Usá **Ajustes → Exportar copia** cada tanto.

## Archivos

| Archivo | Para qué |
|---|---|
| `index.html` | Estructura de la app |
| `style.css` | Estilos (modo claro y oscuro automático) |
| `app.js` | Lógica: gastos, fijos, categorías, resumen |
| `sw.js`, `manifest.json`, `icon*` | Para instalarla y usarla offline |

Las categorías se agregan o quitan desde **Ajustes → Categorías**. `CATEGORIAS`, al principio de `app.js`, es la lista de fábrica.
