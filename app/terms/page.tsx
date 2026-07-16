import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = { title: "Términos y Condiciones – Ropinder" };

export default function TermsPage() {
  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-14">
      <Link href="/profile" className="flex items-center gap-1 text-slate-400 hover:text-slate-600 text-sm mb-4">
        <ArrowLeft size={16} /> Volver
      </Link>

      <h1 className="text-2xl font-bold text-slate-800 mb-1">Términos y Condiciones</h1>
      <p className="text-xs text-slate-400 mb-6">Última actualización: {new Date().toLocaleDateString("es-AR")}</p>

      <div className="flex flex-col gap-5 text-sm text-slate-600 leading-relaxed">
        <section>
          <h2 className="font-bold text-slate-800 mb-1">1. Aceptación</h2>
          <p>Al crear una cuenta en Ropinder aceptás estos Términos y Condiciones en su totalidad. Si no estás de acuerdo, no debés usar la aplicación.</p>
        </section>

        <section>
          <h2 className="font-bold text-slate-800 mb-1">2. Qué es Ropinder</h2>
          <p>Ropinder es una plataforma que conecta usuarios para intercambiar o vender ropa usada entre particulares (peer-to-peer). Ropinder no es propietaria, no fabrica, no inspecciona físicamente ni garantiza la calidad, autenticidad, legalidad o estado de las prendas publicadas por los usuarios. Actuamos como intermediarios tecnológicos, no como parte de la transacción de compraventa en sí.</p>
        </section>

        <section>
          <h2 className="font-bold text-slate-800 mb-1">3. Elegibilidad y cuenta</h2>
          <p>Tenés que ser mayor de 18 años para usar Ropinder. Sos responsable de mantener la confidencialidad de tu contraseña y de toda la actividad que ocurra en tu cuenta. El nombre de usuario debe ser único y no puede haber más de una cuenta por persona/email.</p>
        </section>

        <section>
          <h2 className="font-bold text-slate-800 mb-1">4. Contenido publicado</h2>
          <p>Al publicar una prenda declarás que las fotos representan fielmente el producto real que vas a entregar. Está prohibido publicar imágenes generadas o alteradas por inteligencia artificial que se presenten como fotos reales del producto, así como contenido falso, engañoso, ilegal o que infrinja derechos de terceros. Ropinder puede remover publicaciones y suspender cuentas que incumplan esta regla, a criterio del equipo de moderación.</p>
        </section>

        <section>
          <h2 className="font-bold text-slate-800 mb-1">5. Pagos y custodia (escrow)</h2>
          <p>Cuando una compra se paga dentro de la app, el dinero queda retenido por Ropinder en custodia hasta que el comprador confirma haber recibido la prenda. Recién ahí se libera el pago al vendedor, menos la comisión de la plataforma. Los fondos liberados quedan disponibles para retiro 48 horas después de la liberación; retirar entre las 48 y 72 horas tiene un cargo adicional, y después de 72 horas el retiro no tiene cargo.</p>
        </section>

        <section>
          <h2 className="font-bold text-slate-800 mb-1">6. Reembolsos y disputas</h2>
          <p>Si una venta no se concreta según lo acordado (la prenda no llega, no coincide con lo publicado, o hay un incumplimiento comprobable), el comprador puede reportar el match desde la app. El equipo de administración revisa el caso y, si corresponde, reembolsa el monto pagado al comprador — incluso si esos fondos ya habían sido liberados al vendedor. La decisión de reembolso queda a criterio razonable del equipo de moderación en base a la evidencia disponible.</p>
        </section>

        <section>
          <h2 className="font-bold text-slate-800 mb-1">7. Suspensión de cuentas</h2>
          <p>Ropinder puede suspender o dar de baja cuentas que violen estos términos, publiquen contenido fraudulento, reciban reportes fundados reiterados, o pongan en riesgo a otros usuarios. La suspensión bloquea el acceso a la cuenta; los fondos ya liberados y disponibles siguen siendo del usuario y pueden reclamarse contactando al equipo.</p>
        </section>

        <section>
          <h2 className="font-bold text-slate-800 mb-1">8. Limitación de responsabilidad</h2>
          <p>Ropinder no garantiza la veracidad de las publicaciones ni la conducta de los usuarios. Las transacciones y el intercambio físico de las prendas ocurren entre los propios usuarios; cualquier disputa sobre la calidad, el estado o la entrega del producto es, en primera instancia, responsabilidad de las partes involucradas. Ropinder no será responsable por daños indirectos, pérdida de ganancias, ni por conductas de terceros usuarios, dentro de los límites permitidos por la ley aplicable.</p>
        </section>

        <section>
          <h2 className="font-bold text-slate-800 mb-1">9. Propiedad del contenido</h2>
          <p>Conservás la titularidad de las fotos y descripciones que publicás. Al subirlas, le otorgás a Ropinder una licencia para mostrarlas dentro de la app con el fin de operar el servicio.</p>
        </section>

        <section>
          <h2 className="font-bold text-slate-800 mb-1">10. Cambios en los términos</h2>
          <p>Podemos actualizar estos términos en cualquier momento. El uso continuado de la app después de un cambio implica la aceptación de la nueva versión.</p>
        </section>

        <section>
          <h2 className="font-bold text-slate-800 mb-1">11. Ley aplicable</h2>
          <p>Estos términos se rigen por las leyes de la República Argentina. Cualquier conflicto se someterá a los tribunales ordinarios competentes de la Ciudad Autónoma de Buenos Aires.</p>
        </section>

        <section>
          <h2 className="font-bold text-slate-800 mb-1">12. Contacto</h2>
          <p>Para consultas sobre estos términos o para reclamar fondos de una cuenta suspendida, contactá al equipo de Ropinder a través de los canales de soporte disponibles en la app.</p>
        </section>
      </div>
    </div>
  );
}
