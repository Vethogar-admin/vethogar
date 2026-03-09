export type LegalDocumentKey = "terms" | "privacy" | "cookies";

export type LegalDocumentSection = {
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

export type LegalDocument = {
  title: string;
  lastUpdated: string;
  intro: string;
  sections: LegalDocumentSection[];
};

export const legalDocuments: Record<LegalDocumentKey, LegalDocument> = {
  terms: {
    title: "Términos y Condiciones de Uso - VetHogar",
    lastUpdated: "Marzo 2026",
    intro:
      "VetHogar es una plataforma digital orientada a facilitar la conexión entre tutores de mascotas y médicos veterinarios o profesionales del sector veterinario que ofrecen diferentes tipos de servicios relacionados con la salud, bienestar y cuidado de animales de compañía.",
    sections: [
      {
        title: "1. Identificación de la Plataforma",
        paragraphs: [
          "VetHogar funciona como un espacio de visibilidad y contacto profesional donde los veterinarios pueden presentar sus servicios y donde los tutores de mascotas pueden encontrar profesionales que se ajusten a sus necesidades.",
          "El uso de la plataforma implica que el usuario ha leído, comprendido y acepta plenamente los presentes Términos y Condiciones de Uso.",
        ],
      },
      {
        title: "2. Objeto de la Plataforma",
        paragraphs: [
          "El objetivo principal de VetHogar es servir como un punto de conexión entre profesionales veterinarios y tutores de mascotas, permitiendo que los profesionales puedan promocionar y ofrecer sus servicios y que los usuarios puedan acceder a información que facilite encontrar atención veterinaria.",
          "Dentro de la plataforma se podrán realizar acciones como:",
        ],
        bullets: [
          "Visualizar perfiles de profesionales veterinarios.",
          "Conocer servicios ofrecidos por cada profesional.",
          "Acceder a información de contacto profesional.",
          "Facilitar la comunicación entre tutores de mascotas y veterinarios.",
          "VetHogar actúa exclusivamente como intermediario tecnológico y no presta directamente servicios médicos veterinarios.",
        ],
      },
      {
        title: "3. Naturaleza del Servicio",
        paragraphs: [
          "VetHogar es una plataforma tecnológica de intermediación y visibilidad profesional. No constituye un centro veterinario, clínica, hospital veterinario ni servicio médico directo.",
          "Esto significa que:",
        ],
        bullets: [
          "VetHogar no realiza diagnósticos médicos.",
          "VetHogar no prescribe medicamentos.",
          "VetHogar no realiza tratamientos veterinarios.",
          "VetHogar no sustituye la consulta clínica con un médico veterinario.",
          "Toda decisión médica relacionada con la salud de una mascota debe ser tomada por un profesional veterinario debidamente habilitado.",
        ],
      },
      {
        title: "4. Responsabilidad Profesional",
        paragraphs: [
          "Cada médico veterinario registrado en la plataforma es responsable de manera individual y exclusiva por los servicios que ofrece.",
          "Esto incluye, pero no se limita a:",
        ],
        bullets: [
          "Diagnósticos emitidos.",
          "Tratamientos recomendados o realizados.",
          "Procedimientos clínicos o quirúrgicos.",
          "Interpretación de exámenes diagnósticos.",
          "Seguimiento clínico del paciente.",
          "VetHogar no supervisa ni controla la práctica clínica de los profesionales registrados y, por lo tanto, no asume responsabilidad por decisiones médicas tomadas por dichos profesionales.",
        ],
      },
      {
        title: "5. Registro y Responsabilidad de los Profesionales",
        paragraphs: [
          "Los profesionales que deseen registrarse en la plataforma deberán proporcionar información veraz, actualizada y verificable.",
          "Los veterinarios registrados se comprometen a:",
        ],
        bullets: [
          "Poseer formación profesional válida para el ejercicio de la medicina veterinaria.",
          "Cumplir con las normativas legales y sanitarias vigentes.",
          "Mantener actualizada su información profesional.",
          "Ofrecer servicios de manera ética y responsable.",
          "VetHogar se reserva el derecho de revisar, suspender o eliminar perfiles que contengan información falsa, engañosa o que incumpla las normas de uso de la plataforma.",
        ],
      },
      {
        title: "6. Uso Adecuado de la Plataforma",
        paragraphs: [
          "Los usuarios de VetHogar se comprometen a utilizar la plataforma de forma responsable, respetuosa y conforme a la ley.",
          "Queda prohibido:",
        ],
        bullets: [
          "Proporcionar información falsa.",
          "Suplantar la identidad de otras personas.",
          "Utilizar la plataforma para fines fraudulentos.",
          "Realizar actividades que afecten la seguridad o funcionamiento de la plataforma.",
          "VetHogar podrá suspender o eliminar cuentas que incumplan estas normas sin previo aviso.",
        ],
      },
      {
        title: "7. Relación entre Tutores y Profesionales",
        paragraphs: [
          "La relación profesional se establece exclusivamente entre el tutor de la mascota y el veterinario seleccionado.",
          "VetHogar no interviene en:",
        ],
        bullets: [
          "La negociación de precios.",
          "Los acuerdos económicos.",
          "La ejecución del servicio veterinario.",
          "El resultado de los servicios prestados.",
          "La responsabilidad por los servicios prestados recae exclusivamente en el profesional que los realiza.",
        ],
      },
      {
        title: "8. Cancelaciones, Reclamos y Conflictos",
        paragraphs: [
          "Cualquier cancelación de citas, reprogramación o desacuerdo relacionado con la prestación de servicios deberá ser gestionado directamente entre el tutor de la mascota y el profesional veterinario.",
          "VetHogar no actúa como parte contractual en la prestación del servicio y no se hace responsable por conflictos derivados de dicha relación.",
        ],
      },
      {
        title: "9. Protección de Datos Personales",
        paragraphs: [
          "VetHogar recopila y gestiona datos personales necesarios para el funcionamiento de la plataforma.",
          "Los datos pueden incluir:",
        ],
        bullets: [
          "Nombre completo.",
          "Correo electrónico.",
          "Número telefónico.",
          "Información profesional.",
          "Información básica de contacto.",
          "El tratamiento de estos datos se realiza conforme a la legislación vigente en materia de protección de datos personales en Colombia, particularmente la Ley 1581 de 2012.",
          "Los datos serán utilizados únicamente para el funcionamiento de la plataforma y para facilitar la conexión entre usuarios y profesionales.",
        ],
      },
      {
        title: "10. Propiedad Intelectual",
        paragraphs: [
          "Todos los contenidos presentes en la plataforma, incluyendo textos, logotipos, diseños, estructura, imágenes y elementos gráficos, son propiedad de VetHogar o cuentan con autorización para su uso.",
          "Queda prohibida la reproducción, distribución o modificación del contenido sin autorización expresa.",
        ],
      },
      {
        title: "11. Limitación de Responsabilidad",
        paragraphs: [
          "VetHogar no garantiza resultados médicos ni clínicos derivados de la interacción entre usuarios y profesionales.",
          "Asimismo, VetHogar no se responsabiliza por:",
        ],
        bullets: [
          "Información incorrecta publicada por terceros.",
          "Interrupciones temporales del servicio.",
          "Decisiones médicas tomadas por los profesionales registrados.",
        ],
      },
      {
        title: "12. Modificaciones de los Términos",
        paragraphs: [
          "VetHogar podrá modificar estos términos y condiciones en cualquier momento con el fin de mejorar el servicio o adaptarse a cambios legales.",
          "Las modificaciones entrarán en vigor desde el momento de su publicación en la plataforma.",
        ],
      },
      {
        title: "13. Legislación Aplicable",
        paragraphs: [
          "Los presentes Términos y Condiciones se rigen por la legislación vigente de la República de Colombia.",
          "Cualquier controversia relacionada con el uso de la plataforma será resuelta conforme a las leyes colombianas.",
        ],
      },
      {
        title: "14. Aceptación de los Términos",
        paragraphs: [
          "Al acceder, registrarse o utilizar la plataforma VetHogar, el usuario declara haber leído, comprendido y aceptado en su totalidad los presentes Términos y Condiciones.",
        ],
      },
    ],
  },
  privacy: {
    title: "Politica de Privacidad",
    lastUpdated: "16 de febrero de 2026",
    intro:
      "Esta politica explica como recolectamos, usamos y protegemos la informacion personal en Vethogar.",
    sections: [
      {
        title: "1. Datos que recolectamos",
        paragraphs: [
          "Podemos recolectar datos de registro como nombre, correo, telefono, ciudad y rol de cuenta.",
          "En perfiles profesionales se pueden recolectar documentos, certificaciones, logo/foto y enlaces de redes.",
        ],
      },
      {
        title: "2. Finalidades del tratamiento",
        paragraphs: [
          "Usamos los datos para crear cuentas, autenticar usuarios, gestionar perfiles y permitir la comunicacion entre usuarios.",
          "Tambien usamos informacion para seguridad, prevencion de fraude, soporte y mejora de la experiencia del producto.",
        ],
      },
      {
        title: "3. Base de tratamiento y conservacion",
        paragraphs: [
          "Tratamos datos con base en consentimiento, ejecucion del servicio e interes legitimo de seguridad operativa.",
          "Conservamos la informacion por el tiempo necesario para prestar el servicio y cumplir obligaciones legales.",
        ],
      },
      {
        title: "4. Comparticion de informacion",
        paragraphs: [
          "No vendemos tus datos personales.",
          "Podemos compartir informacion con proveedores tecnologicos necesarios para operar Vethogar, bajo medidas de seguridad y confidencialidad.",
        ],
      },
      {
        title: "5. Derechos del titular",
        paragraphs: [
          "Puedes solicitar acceso, correccion, actualizacion o eliminacion de tus datos cuando aplique.",
          "Tambien puedes revocar autorizaciones y ejercer tus derechos escribiendo a hola@vethogar.com.",
        ],
      },
      {
        title: "6. Seguridad",
        paragraphs: [
          "Aplicamos medidas tecnicas y organizativas razonables para proteger la informacion contra acceso no autorizado, perdida o alteracion.",
          "Ningun sistema es 100 por ciento invulnerable, por lo que recomendamos tambien buenas practicas de seguridad de cuenta.",
        ],
      },
      {
        title: "7. Menores de edad",
        paragraphs: [
          "Vethogar no esta dirigido a menores de edad sin supervision de su representante legal.",
        ],
      },
    ],
  },
  cookies: {
    title: "Politica de Cookies",
    lastUpdated: "16 de febrero de 2026",
    intro:
      "Esta politica describe como usamos cookies y tecnologias similares para mejorar el funcionamiento de Vethogar.",
    sections: [
      {
        title: "1. Que son las cookies",
        paragraphs: [
          "Las cookies son pequeños archivos que el navegador guarda para recordar informacion de tu sesion o preferencias.",
        ],
      },
      {
        title: "2. Tipos de cookies que podemos usar",
        paragraphs: [
          "Usamos cookies esenciales para funciones basicas como inicio de sesion y seguridad.",
        ],
        bullets: [
          "Cookies esenciales: necesarias para operar la plataforma.",
          "Cookies de preferencia: guardan ajustes de experiencia.",
          "Cookies de analitica: ayudan a entender uso y mejorar el producto.",
        ],
      },
      {
        title: "3. Finalidades",
        paragraphs: [
          "Las cookies nos permiten mantener sesiones activas, recordar configuraciones y analizar rendimiento del sitio.",
          "No usamos cookies para vender datos personales a terceros.",
        ],
      },
      {
        title: "4. Gestion de cookies",
        paragraphs: [
          "Puedes bloquear o eliminar cookies desde la configuracion de tu navegador.",
          "Si desactivas cookies esenciales, algunas funciones del sitio pueden dejar de operar correctamente.",
        ],
      },
      {
        title: "5. Cambios y contacto",
        paragraphs: [
          "Podemos actualizar esta politica cuando cambien nuestros procesos o requisitos legales.",
          "Para dudas, contactanos en hola@vethogar.com.",
        ],
      },
    ],
  },
};

export const legalDocumentPaths: Record<LegalDocumentKey, string> = {
  terms: "/terminos-y-condiciones",
  privacy: "/politica-de-privacidad",
  cookies: "/politica-de-cookies",
};
