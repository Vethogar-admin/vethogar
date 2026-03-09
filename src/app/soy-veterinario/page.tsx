"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Award,
  Building2,
  CheckCircle,
  Clock,
  ClipboardList,
  Clock3,
  Eye,
  EyeOff,
  Facebook,
  FileText,
  Home,
  Images,
  Instagram,
  LayoutTemplate,
  Linkedin,
  FolderOpen,
  MapPin,
  MessageCircle,
  Phone,
  Settings,
  Shield,
  Star,
  Stethoscope,
  Twitter,
  Upload,
  User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { PanelSidebar } from "@/components/PanelSidebar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { legalDocuments } from "@/content/legal-documents";

type ProfileType = "vet" | "clinic";
type ProfilePanelSection = "info" | "hours" | "documents" | "carousel" | "preview" | "settings";

const cities = [
  "Bogotá",
  "Medellín",
  "Arauca",
  "Barranquilla",
  "Cartagena",
  "Tunja",
  "Manizales",
  "Florencia",
  "Yopal",
  "Popayán",
  "Valledupar",
  "Quibdó",
  "Montería",
  "Inírida",
  "San José del Guaviare",
  "Neiva",
  "Riohacha",
  "Santa Marta",
  "Villavicencio",
  "Pasto",
  "Cúcuta",
  "Mocoa",
  "Armenia",
  "Pereira",
  "San Andrés",
  "Bucaramanga",
  "Sincelejo",
  "Ibagué",
  "Cali",
  "Mitú",
  "Puerto Carreño",
];

const OTHER_SPECIALTY_LABEL = "Otro (diga cual)";

const vetSpecialties = [
  "Medicina General",
  "Medicina interna",
  "Cardiologia",
  "Dermatologia",
  "Neurologia",
  "Oncologia",
  "Endocrinologia",
  "Gastroenterologia",
  "Nefrologia y urologia",
  "Infectologia",
  "Medicina felina",
  "Medicina del dolor",
  "Imagenologia",
  "Patologia clinica",
  "Cirugia",
  "Ortopedia",
  "Neurocirugia",
  "Anestesiologia",
  "Oftalmologia",
  "Odontologia",
  "Comportamiento",
  "Nutricion",
  "Fisioterapia",
  "Medicinas alternativas",
  "Fauna silvestre",
  "Neonatologia",
  OTHER_SPECIALTY_LABEL,
];

const clinicServices = [
  "Medicina general",
  "Cirugia",
  "Endoscopia",
  "Ecografia",
  "Radiografia",
  "Consulta general",
  "Consulta especializada",
  "Petshop",
  "Medicinas alternativas",
  "Hospital 24 horas",
  "Guarderia",
  "Laboratorio",
  "Bano, peluqueria",
  "Consulta animales exoticos",
  "Resonancia magnetica",
  "Tomografia",
  OTHER_SPECIALTY_LABEL,
];

const clinicRoles = ["Propietario", "Administrador", "Gerente", "Marketing", "Veterinario interno"];
const sexOptions = ["Hombre", "Mujer", "Prefiero no decirlo"];
const weekDays = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const homeServiceAreaOptions = [
  { value: "norte", label: "Norte" },
  { value: "centro", label: "Centro" },
  { value: "sur", label: "Sur" },
  { value: "oeste", label: "Oeste" },
  { value: "este", label: "Este" },
] as const;
const otherUniversityDegreeOptions = [
  "Especializacion",
  "Maestria",
  "Doctorado",
  "Diplomado",
  "Curso",
];
const ABOUT_MAX_CHARS = 400;
const MAX_UPLOAD_MB = 5;
const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;
const certificateOptionalSpecialties = new Set(["medicina general", "medicina interna"]);
const hourSlots = Array.from({ length: 13 }, (_, index) => {
  const hour = 7 + index;
  return `${hour.toString().padStart(2, "0")}:00`;
});

type ScheduleValue = {
  is24h: boolean;
  slots: Record<string, string[]>;
};

type PublicationItem = {
  title: string;
  url: string;
};

type OtherUniversityItem = {
  degreeType: string;
  title: string;
};

type HomeServiceArea = (typeof homeServiceAreaOptions)[number]["value"];

const createEmptySchedule = (): ScheduleValue => ({
  is24h: false,
  slots: weekDays.reduce<Record<string, string[]>>((acc, day) => {
    acc[day] = [];
    return acc;
  }, {}),
});

const parsePublicationLinks = (value: unknown): PublicationItem[] => {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item) return null;
      if (typeof item === "string") {
        const trimmed = item.trim();
        if (!trimmed) return null;
        if (trimmed.startsWith("{")) {
          try {
            const parsed = JSON.parse(trimmed);
            if (parsed && typeof parsed.url === "string") {
              return {
                title: typeof parsed.title === "string" ? parsed.title : "",
                url: parsed.url,
              };
            }
          } catch {
            return { title: "", url: trimmed };
          }
        }
        return { title: "", url: trimmed };
      }
      if (typeof item === "object") {
        const candidate = item as { title?: unknown; url?: unknown; name?: unknown; link?: unknown };
        const url = typeof candidate.url === "string" ? candidate.url : candidate.link;
        if (typeof url === "string" && url.trim()) {
          return {
            title: typeof candidate.title === "string" ? candidate.title : typeof candidate.name === "string" ? candidate.name : "",
            url,
          };
        }
      }
      return null;
    })
    .filter((item): item is PublicationItem => Boolean(item));
};

const ensureStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
};

const normalizeText = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const isCertificateOptionalForSpecialty = (specialty: string) =>
  certificateOptionalSpecialties.has(normalizeText(specialty));

const homeServiceAreaValueSet = new Set<HomeServiceArea>(homeServiceAreaOptions.map((item) => item.value));

const parseHomeServiceAreas = (raw: unknown): HomeServiceArea[] => {
  if (typeof raw !== "string") return [];
  const normalized = raw
    .split(/[,\n;|]+/)
    .map((item) =>
      item
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, ""),
    )
    .filter(Boolean);
  const unique = Array.from(new Set(normalized));
  return unique.filter((item): item is HomeServiceArea => homeServiceAreaValueSet.has(item as HomeServiceArea));
};

const formatHomeServiceAreas = (areas: HomeServiceArea[]) =>
  areas
    .map((area) => homeServiceAreaOptions.find((item) => item.value === area)?.label ?? area)
    .join(", ");

const formatExperienceStat = (rawValue?: string | null) => {
  if (!rawValue) return "0+";
  const trimmed = rawValue.trim();
  if (!trimmed) return "0+";
  const match = trimmed.match(/\d+/);
  if (!match) return trimmed;
  return `${match[0]}+`;
};

const formatOtherUniversity = (item: OtherUniversityItem) => {
  const title = item.title.trim();
  if (!title) return "";
  const degreeType =
    otherUniversityDegreeOptions.find(
      (option) => option.toLowerCase() === item.degreeType.trim().toLowerCase(),
    ) ?? otherUniversityDegreeOptions[0];
  return `${degreeType}: ${title}`;
};

const parseOtherUniversities = (value: unknown): OtherUniversityItem[] => {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (typeof item === "string") {
        const raw = item.trim();
        if (!raw) return null;

        for (const option of otherUniversityDegreeOptions) {
          const prefixes = [`${option}: `, `${option} - `];
          const matchedPrefix = prefixes.find((prefix) =>
            raw.toLowerCase().startsWith(prefix.toLowerCase()),
          );
          if (matchedPrefix) {
            const title = raw.slice(matchedPrefix.length).trim();
            return {
              degreeType: option,
              title: title || raw,
            };
          }
        }

        return {
          degreeType: otherUniversityDegreeOptions[0],
          title: raw,
        };
      }

      if (typeof item === "object" && item) {
        const candidate = item as {
          degreeType?: unknown;
          degree_type?: unknown;
          title?: unknown;
          name?: unknown;
          value?: unknown;
        };
        const degreeTypeRaw =
          typeof candidate.degreeType === "string"
            ? candidate.degreeType
            : typeof candidate.degree_type === "string"
            ? candidate.degree_type
            : "";
        const titleRaw =
          typeof candidate.title === "string"
            ? candidate.title
            : typeof candidate.name === "string"
            ? candidate.name
            : typeof candidate.value === "string"
            ? candidate.value
            : "";
        const title = titleRaw.trim();
        if (!title) return null;
        const degreeType =
          otherUniversityDegreeOptions.find(
            (option) => option.toLowerCase() === degreeTypeRaw.trim().toLowerCase(),
          ) ?? otherUniversityDegreeOptions[0];
        return { degreeType, title };
      }

      return null;
    })
    .filter((item): item is OtherUniversityItem => item !== null && item.title.trim().length > 0);
};

type PreviewProfileData = {
  name: string;
  type: string;
  specialties: string[];
  city: string;
  experience: string;
  phone: string;
  consultationCost: string;
  imageFile: File | null;
  imageUrl: string;
  verified: boolean;
  about: string;
  address: string;
  schedule: { day: string; hours: string }[];
  socialLinks: { instagram?: string; facebook?: string; twitter?: string; linkedin?: string };
  publicationLinks: PublicationItem[];
  detailItems: { label: string; value: string }[];
  isClinic: boolean;
  carouselSavedUrls: string[];
  carouselNewFiles: File[];
};

const PREVIEW_FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=600";

const formatHourLabel = (value: string) => {
  const [rawHour] = value.split(":");
  const hour = Number(rawHour);
  if (Number.isNaN(hour)) return value;
  const suffix = hour >= 12 ? "pm" : "am";
  const hour12 = ((hour + 11) % 12) + 1;
  return `${hour12}${suffix}`;
};

const buildHourRanges = (slots: string[]) => {
  const hours = Array.from(
    new Set(
      slots
        .map((slot) => Number(slot.split(":")[0]))
        .filter((hour) => !Number.isNaN(hour)),
    ),
  ).sort((a, b) => a - b);

  if (hours.length === 0) return [] as Array<[number, number]>;

  const ranges: Array<[number, number]> = [];
  let start = hours[0];
  let prev = hours[0];

  for (let i = 1; i < hours.length; i += 1) {
    const current = hours[i];
    if (current === prev + 1) {
      prev = current;
      continue;
    }
    ranges.push([start, prev]);
    start = current;
    prev = current;
  }

  ranges.push([start, prev]);
  return ranges;
};

const formatScheduleForPreview = (schedule: ScheduleValue) => {
  if (schedule.is24h) return [{ day: "Todos los dias", hours: "24 horas" }];

  const entries = weekDays
    .map((day) => {
      const daySlots = schedule.slots[day] ?? [];
      if (daySlots.length === 0) return null;
      const ranges = buildHourRanges(daySlots);
      if (ranges.length === 0) return null;
      const hours = ranges
        .map(([start, end]) => {
          const startLabel = formatHourLabel(`${start}:00`);
          const endLabel = formatHourLabel(`${end}:00`);
          return start === end ? startLabel : `${startLabel} - ${endLabel}`;
        })
        .join(" · ");
      return { day, hours };
    })
    .filter((item): item is { day: string; hours: string } => Boolean(item));

  return entries.length > 0 ? entries : [{ day: "Horario", hours: "Previa cita" }];
};

function SchedulePicker({
  value,
  onChange,
}: {
  value: ScheduleValue;
  onChange: (next: ScheduleValue) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<"select" | "deselect" | null>(null);

  const applySlot = (day: string, hour: string, shouldSelect: boolean) => {
    if (value.is24h) return;
    const daySlots = value.slots[day] ?? [];
    const hasSlot = daySlots.includes(hour);
    if (shouldSelect && hasSlot) return;
    if (!shouldSelect && !hasSlot) return;

    const nextSlots = shouldSelect
      ? [...daySlots, hour]
      : daySlots.filter((item) => item !== hour);

    onChange({
      ...value,
      slots: {
        ...value.slots,
        [day]: nextSlots,
      },
    });
  };

  const handleStartDrag = (day: string, hour: string) => (e: React.PointerEvent) => {
    if (value.is24h) return;
    e.preventDefault();
    const isSelected = value.slots[day]?.includes(hour) ?? false;
    const nextMode: "select" | "deselect" = isSelected ? "deselect" : "select";
    setIsDragging(true);
    setDragMode(nextMode);
    applySlot(day, hour, nextMode === "select");
  };

  const handleEnterDrag = (day: string, hour: string) => (e: React.PointerEvent) => {
    if (!isDragging || !dragMode || value.is24h) return;
    e.preventDefault();
    applySlot(day, hour, dragMode === "select");
  };

  const stopDrag = () => {
    setIsDragging(false);
    setDragMode(null);
  };

  return (
    <div className="space-y-4">
      <label className="flex items-center gap-3 text-sm font-semibold text-gray-700">
        <input
          type="checkbox"
          checked={value.is24h}
          onChange={(e) =>
            onChange({
              ...value,
              is24h: e.target.checked,
              slots: e.target.checked ? createEmptySchedule().slots : value.slots,
            })
          }
          className="h-4 w-4 rounded border-purple-300"
        />
        24 horas
      </label>

      <div
        className="overflow-x-auto rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50/80 via-white/80 to-fuchsia-50/80 shadow-sm select-none"
        onPointerUp={stopDrag}
        onPointerLeave={stopDrag}
        onPointerCancel={stopDrag}
      >
        <table className="w-full text-[13px] text-gray-700">
          <thead className="bg-purple-100/70 text-purple-700">
            <tr>
              <th className="px-2 py-1.5 text-left font-semibold">Hora</th>
              {weekDays.map((day) => (
                <th key={day} className="px-1.5 py-1.5 text-center font-medium">
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {hourSlots.map((hour, hourIndex) => (
              <tr
                key={hour}
                className={`border-t border-purple-100 ${
                  hourIndex % 2 === 0 ? "bg-white/70" : "bg-purple-50/60"
                }`}
              >
                <td className="px-2 py-1.5 font-semibold text-gray-700">{hour}</td>
                {weekDays.map((day) => {
                  const checked = value.slots[day]?.includes(hour) ?? false;
                  return (
                    <td key={`${day}-${hour}`} className="px-0.5 py-0.5 text-center">
                      <input
                        type="checkbox"
                        checked={checked}
                        readOnly
                        disabled={value.is24h}
                        onPointerDown={handleStartDrag(day, hour)}
                        onPointerEnter={handleEnterDrag(day, hour)}
                        onClick={(e) => e.preventDefault()}
                        className="h-6 w-6 rounded border-purple-300 accent-purple-600 cursor-pointer disabled:opacity-40"
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FilePreview({
  file,
  url,
  label,
}: {
  file: File | null;
  url?: string | null;
  label: string;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const nextUrl = URL.createObjectURL(file);
    setPreviewUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [file]);

  if (!file && !url) return null;

  const isImage =
    (file && file.type.startsWith("image/")) ||
    Boolean(url && /\.(png|jpe?g|webp|gif)$/i.test(url));

  return (
    <div className="mt-3 rounded-2xl border border-purple-100 bg-white/70 p-3">
      {isImage && (previewUrl || url) ? (
        <img src={previewUrl || url || ""} alt={label} className="h-40 w-full rounded-xl object-cover" />
      ) : (
        <div className="flex items-center gap-3 rounded-xl border border-purple-100 bg-white px-3 py-4 text-sm text-gray-700">
          <FileText className="h-5 w-5 text-purple-600" />
          <span className="truncate">{file?.name ?? label}</span>
        </div>
      )}
    </div>
  );
}

function LogoPreview({ file, url }: { file: File | null; url?: string | null }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const nextUrl = URL.createObjectURL(file);
    setPreviewUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [file]);

  if (file && previewUrl) {
    return <img src={previewUrl} alt="Logo de clinica" className="h-full w-full object-cover" />;
  }

  if (url) {
    return <img src={url} alt="Logo de clinica" className="h-full w-full object-cover" />;
  }

  if (!file) {
    return <Building2 className="h-8 w-8 text-purple-500" />;
  }

  return <Building2 className="h-8 w-8 text-purple-500" />;
}

function PreviewAvatarImage({
  file,
  url,
  alt,
  className,
}: {
  file: File | null;
  url?: string | null;
  alt: string;
  className: string;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const nextUrl = URL.createObjectURL(file);
    setPreviewUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [file]);

  const src = previewUrl || url || PREVIEW_FALLBACK_IMAGE;

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={(event) => {
        if (event.currentTarget.src !== PREVIEW_FALLBACK_IMAGE) {
          event.currentTarget.src = PREVIEW_FALLBACK_IMAGE;
        }
      }}
    />
  );
}

function DirectoryProfileCardPreview({ profile }: { profile: PreviewProfileData }) {
  return (
    <article className="group bg-white/80 border border-purple-100/60 rounded-3xl overflow-hidden shadow-lg">
      <div className="relative h-44 md:h-48">
        <PreviewAvatarImage
          file={profile.imageFile}
          url={profile.imageUrl}
          alt={profile.name}
          className="h-full w-full object-cover object-top"
        />
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/20 to-transparent" />
        <div className="absolute left-4 top-4 rounded-2xl bg-white/90 px-3 py-2 shadow-md">
          <p className="text-[10px] uppercase tracking-widest text-purple-600 font-semibold">
            Valor consulta
          </p>
          <p className="text-lg font-bold text-gray-900">{profile.consultationCost || "A convenir"}</p>
        </div>
        {profile.verified ? (
          <div className="absolute right-4 top-4 flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 shadow-md">
            <CheckCircle className="h-4 w-4 text-emerald-500" />
            <span className="text-sm font-medium text-gray-700">Verificado</span>
          </div>
        ) : null}
      </div>

      <div className="p-5">
        <h3 className="text-lg font-bold text-gray-900 mb-2">{profile.name}</h3>
        <div className="flex items-center gap-2 text-sm text-gray-700 mb-2">
          <Stethoscope className="h-4 w-4 text-purple-600" />
          <span>{profile.specialties[0] || profile.type}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
          <MapPin className="h-4 w-4 text-purple-600" />
          <span>{profile.city || "Ciudad pendiente"}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <Star className="h-4 w-4 text-amber-500" />
          <span>0.0 (0 reseñas)</span>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            className="flex-1 inline-flex items-center justify-center gap-2 h-11 rounded-full bg-emerald-500 text-white text-sm font-semibold shadow-md"
          >
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </button>
          <button
            type="button"
            className="flex-1 inline-flex items-center justify-center gap-2 h-11 rounded-full text-sm font-semibold text-purple-700 border border-purple-200 bg-gradient-to-r from-purple-100 to-fuchsia-100 shadow-sm"
          >
            <Phone className="h-4 w-4" /> Llamar
          </button>
        </div>
      </div>
    </article>
  );
}

function FullProfilePreview({ profile }: { profile: PreviewProfileData }) {
  const [activeCarouselIndex, setActiveCarouselIndex] = useState(0);

  const socialItems = [
    { key: "instagram", label: "Instagram", icon: Instagram, url: profile.socialLinks.instagram },
    { key: "facebook", label: "Facebook", icon: Facebook, url: profile.socialLinks.facebook },
    { key: "twitter", label: "Twitter", icon: Twitter, url: profile.socialLinks.twitter },
    { key: "linkedin", label: "LinkedIn", icon: Linkedin, url: profile.socialLinks.linkedin },
  ].filter((item) => item.url && item.url.trim().length > 0);

  const carouselFilePreviews = useMemo(
    () =>
      profile.carouselNewFiles.map((file) => ({
        key: `new-${file.name}`,
        src: URL.createObjectURL(file),
      })),
    [profile.carouselNewFiles],
  );

  useEffect(() => {
    return () => {
      carouselFilePreviews.forEach((item) => URL.revokeObjectURL(item.src));
    };
  }, [carouselFilePreviews]);

  const carouselPhotos = [
    profile.imageUrl,
    ...profile.carouselSavedUrls,
    ...carouselFilePreviews.map((item) => item.src),
  ].filter((item, index, array) => Boolean(item) && array.indexOf(item) === index);

  useEffect(() => {
    if (carouselPhotos.length === 0) {
      setActiveCarouselIndex(0);
      return;
    }
    setActiveCarouselIndex((prev) => Math.min(prev, carouselPhotos.length - 1));
  }, [carouselPhotos.length]);

  const cityValue = profile.city?.trim() || "Ciudad pendiente";
  const experienceValue = formatExperienceStat(profile.experience);
  const ratingValue = "0.0";

  return (
    <div className="overflow-hidden rounded-3xl border border-purple-100/80">
      <div className="bg-gradient-to-b from-purple-50 via-pink-50 to-blue-50 px-4 py-8 md:px-6">
        <div className="bg-white/60 backdrop-blur-xl rounded-3xl shadow-2xl p-6 md:p-8 border border-white/60 mb-8">
          <div className="flex flex-col md:flex-row gap-6 items-start mb-6">
            <div className="relative flex-shrink-0">
              <div className="w-28 h-28 md:w-36 md:h-36 rounded-3xl overflow-hidden shadow-xl border-4 border-white">
                <PreviewAvatarImage
                  file={profile.imageFile}
                  url={profile.imageUrl}
                  alt={profile.name}
                  className="w-full h-full object-cover"
                />
              </div>
              {profile.verified ? (
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#10B981] to-[#059669] text-white px-4 py-1.5 rounded-full flex items-center gap-2 text-xs font-semibold shadow-lg whitespace-nowrap">
                  <Shield className="w-3.5 h-3.5" />
                  Verificado
                </div>
              ) : null}
            </div>

            <div className="flex-1">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-1">{profile.name}</h3>
                  <p className="text-lg text-gray-600 mb-3 font-medium">{profile.type}</p>
                </div>
                <div className="rounded-2xl border border-purple-200 bg-white/80 px-4 py-3 shadow-lg">
                  <p className="text-xs font-semibold uppercase tracking-wide text-purple-600">Valor consulta</p>
                  <p className="text-2xl font-bold text-gray-900">{profile.consultationCost || "A convenir"}</p>
                </div>
              </div>

              <div className="mb-4 overflow-hidden rounded-2xl border border-purple-100/90 bg-white/85 shadow-sm">
                <div className="grid grid-cols-3">
                  <div className="px-3 py-4 text-center">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-purple-600/80">
                      Ciudad
                    </p>
                    <p className="mt-1 text-xl font-bold leading-tight text-gray-900 md:text-2xl">
                      {cityValue}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">Cerca a ti</p>
                  </div>
                  <div className="border-x border-purple-100/90 px-3 py-4 text-center">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-purple-600/80">
                      Experiencia
                    </p>
                    <p className="mt-1 text-2xl font-bold leading-tight text-gray-900 md:text-3xl">
                      {experienceValue}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">Años</p>
                  </div>
                  <div className="px-3 py-4 text-center">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-purple-600/80">
                      Calificaciones
                    </p>
                    <p className="mt-1 text-2xl font-bold leading-tight text-gray-900 md:text-3xl">
                      {ratingValue}
                    </p>
                    <div className="mt-1 flex items-center justify-center gap-0.5">
                      {Array.from({ length: 5 }, (_, index) => (
                        <Star key={`preview-star-${index}`} className="h-3.5 w-3.5 text-gray-300" />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {!profile.isClinic ? (
                <div className="flex flex-wrap gap-2">
                  <span className="bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full text-sm font-semibold flex items-center gap-1">
                    <Home className="w-4 h-4" />
                    Servicio a Domicilio
                  </span>
                </div>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-5 border-t border-gray-200">
            <button
              type="button"
              className="bg-gradient-to-r from-[#25D366] to-[#1fb855] text-white font-bold py-3 px-6 rounded-2xl shadow-xl shadow-emerald-500/30 flex items-center justify-center gap-3"
            >
              <MessageCircle className="w-5 h-5" />
              Chatear por WhatsApp
            </button>
            <button
              type="button"
              className="bg-gradient-to-r from-purple-100 to-pink-100 text-[#7C3AED] font-bold py-3 px-6 rounded-2xl shadow-lg flex items-center justify-center gap-3 border-2 border-purple-200"
            >
              <Phone className="w-5 h-5" />
              Llamar
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white/60 backdrop-blur-xl rounded-3xl p-4 shadow-lg border border-white/50">
              <div className="relative flex items-center rounded-full bg-white/80 border border-purple-100 p-1">
                <div className="absolute inset-y-1 left-1 w-1/3 rounded-full bg-gradient-to-r from-[#7C3AED] to-[#EC4899] shadow-md shadow-purple-500/30" />
                <div className="relative z-10 flex w-full">
                  <button type="button" className="flex-1 px-3 py-2 text-sm font-semibold text-white">
                    Perfil
                  </button>
                  <button type="button" className="flex-1 px-3 py-2 text-sm font-semibold text-gray-700">
                    Educación y Experiencia
                  </button>
                  <button type="button" className="flex-1 px-3 py-2 text-sm font-semibold text-gray-700">
                    Reseñas
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white/60 backdrop-blur-xl rounded-3xl p-6 shadow-xl border border-white/50">
              <h4 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl flex items-center justify-center">
                  <Award className="w-5 h-5 text-white" />
                </div>
                Sobre {profile.isClinic ? "nosotros" : "mí"}
              </h4>
              <p className="text-gray-700 leading-relaxed">
                {profile.about || "Este perfil aun no ha agregado una descripcion detallada."}
              </p>
            </div>

            {carouselPhotos.length > 0 ? (
              <div className="bg-white/60 backdrop-blur-xl rounded-3xl p-6 shadow-xl border border-white/50">
                <h4 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-purple-600 rounded-xl flex items-center justify-center">
                    <Images className="w-5 h-5 text-white" />
                  </div>
                  Carrusel de fotos
                </h4>
                <div className="overflow-hidden rounded-3xl border border-purple-100 bg-white">
                  <img
                    src={carouselPhotos[activeCarouselIndex]}
                    alt={`Carrusel ${activeCarouselIndex + 1}`}
                    className="h-72 w-full object-cover"
                  />
                </div>
                {carouselPhotos.length > 1 ? (
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {carouselPhotos.map((url, index) => (
                      <button
                        type="button"
                        key={`${url}-${index}`}
                        onClick={() => setActiveCarouselIndex(index)}
                        className={`overflow-hidden rounded-2xl border ${
                          activeCarouselIndex === index
                            ? "border-purple-400 ring-2 ring-purple-100"
                            : "border-purple-100"
                        }`}
                      >
                        <img src={url} alt={`Miniatura ${index + 1}`} className="h-24 w-full object-cover" />
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="bg-white/60 backdrop-blur-xl rounded-3xl p-6 shadow-xl border border-white/50">
              <h4 className="text-xl font-bold text-gray-900 mb-5 flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-pink-400 to-rose-600 rounded-xl flex items-center justify-center">
                  <Star className="w-5 h-5 text-white" />
                </div>
                {profile.isClinic ? "Enfasis Medico" : "Especialidades"}
              </h4>
              <div className="flex flex-wrap gap-3">
                {profile.specialties.length > 0 ? (
                  profile.specialties.map((item) => (
                    <span
                      key={item}
                      className="bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 px-5 py-2 rounded-2xl font-semibold border-2 border-purple-200"
                    >
                      {item}
                    </span>
                  ))
                ) : (
                  <span className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-500">
                    Sin datos cargados todavía
                  </span>
                )}
              </div>
            </div>

            {profile.detailItems.length > 0 ? (
              <div className="bg-white/60 backdrop-blur-xl rounded-3xl p-6 shadow-xl border border-white/50">
                <h4 className="text-xl font-bold text-gray-900 mb-5 flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-xl flex items-center justify-center">
                    <ClipboardList className="w-5 h-5 text-white" />
                  </div>
                  Educación y Experiencia
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {profile.detailItems.map((item) => (
                    <div
                      key={item.label}
                      className="rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 to-teal-50 px-4 py-3"
                    >
                      <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700/80 mb-1">
                        {item.label}
                      </p>
                      <p className="text-sm font-semibold text-gray-800">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {profile.publicationLinks.length > 0 ? (
              <div className="bg-white/60 backdrop-blur-xl rounded-3xl p-6 shadow-xl border border-white/50">
                <h4 className="text-xl font-bold text-gray-900 mb-5 flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-indigo-600 rounded-xl flex items-center justify-center">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  Publicaciones
                </h4>
                <div className="space-y-3">
                  {profile.publicationLinks.map((item, index) => (
                    <div
                      key={`${item.url}-${index}`}
                      className="flex items-center gap-3 rounded-2xl border border-purple-100 bg-white/70 px-4 py-3"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-600">
                        <FileText className="w-5 h-5" />
                      </div>
                      <span className="text-base font-semibold text-gray-800">
                        {item.title || `Publicación ${index + 1}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white/60 backdrop-blur-xl rounded-3xl p-6 shadow-xl border border-white/50">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-xl flex items-center justify-center">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <h4 className="text-xl font-bold text-gray-900">Horarios</h4>
              </div>
              <div className="space-y-3">
                {profile.schedule.map((item) => (
                  <div
                    key={`${item.day}-${item.hours}`}
                    className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-3 border border-blue-100"
                  >
                    <p className="font-bold text-gray-900">{item.day}</p>
                    <p className="text-gray-600 text-sm">{item.hours}</p>
                  </div>
                ))}
              </div>
            </div>

            {socialItems.length > 0 ? (
              <div className="bg-white/60 backdrop-blur-xl rounded-3xl p-4 shadow-xl border border-white/50">
                <div className="flex flex-wrap gap-3">
                  {socialItems.map((item) => (
                    <a
                      key={item.key}
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex h-12 w-12 items-center justify-center rounded-2xl border border-purple-100 bg-white/80 text-purple-600 shadow-sm"
                      aria-label={item.label}
                    >
                      <item.icon className="w-6 h-6" />
                    </a>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="bg-white/60 backdrop-blur-xl rounded-3xl p-6 shadow-xl border border-white/50">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-red-500 rounded-xl flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-white" />
                </div>
                <h4 className="text-xl font-bold text-gray-900">Ubicación</h4>
              </div>
              <div className="bg-gradient-to-br from-orange-100 to-red-100 rounded-2xl h-36 mb-4 flex items-center justify-center border-2 border-orange-200">
                <MapPin className="w-10 h-10 text-orange-400" />
              </div>
              <p className="text-gray-900 font-bold mb-1">{profile.address || "Dirección pendiente"}</p>
              <p className="text-gray-600">{profile.city || "Ciudad pendiente"}, Colombia</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CarouselPhotosEditor({
  newFiles,
  savedUrls,
  onAdd,
  onRemoveNew,
  onRemoveSaved,
}: {
  newFiles: File[];
  savedUrls: string[];
  onAdd: (file: File | null) => void;
  onRemoveNew: (index: number) => void;
  onRemoveSaved: (index: number) => void;
}) {
  const [activeIndex, setActiveIndex] = useState(0);

  const newFilePreviews = useMemo(
    () => newFiles.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [newFiles],
  );

  useEffect(() => {
    return () => {
      newFilePreviews.forEach((item) => URL.revokeObjectURL(item.url));
    };
  }, [newFilePreviews]);

  const slides = [
    ...savedUrls.map((url, index) => ({
      key: `saved-${index}-${url}`,
      label: `Foto guardada ${index + 1}`,
      src: url,
      kind: "saved" as const,
      index,
    })),
    ...newFilePreviews.map((item, index) => ({
      key: `new-${index}-${item.file.name}`,
      label: item.file.name,
      src: item.url,
      kind: "new" as const,
      index,
    })),
  ];

  useEffect(() => {
    if (slides.length === 0) {
      setActiveIndex(0);
      return;
    }
    if (activeIndex > slides.length - 1) {
      setActiveIndex(slides.length - 1);
    }
  }, [activeIndex, slides.length]);

  const activeSlide = slides[activeIndex];

  return (
    <div className="rounded-3xl border border-purple-100 bg-gradient-to-br from-white via-purple-50/40 to-fuchsia-50/40 p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Carrusel de fotos (opcional)</h3>
          <p className="text-sm text-gray-600">
            Estas fotos se mostrarán en el carrusel del perfil público.
          </p>
        </div>
        <label className="inline-flex cursor-pointer items-center justify-center rounded-2xl bg-gradient-to-r from-[#EC4899] to-[#4F46E5] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/30">
          Agregar foto
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              onAdd(event.target.files?.[0] ?? null);
              event.currentTarget.value = "";
            }}
          />
        </label>
      </div>

      {activeSlide ? (
        <div className="mt-5 space-y-4">
          <div className="relative overflow-hidden rounded-3xl border border-purple-100 bg-white">
            <img src={activeSlide.src} alt={activeSlide.label} className="h-72 w-full object-cover" />
            {slides.length > 1 ? (
              <div className="absolute inset-x-0 bottom-3 flex items-center justify-center">
                <span className="rounded-full bg-black/45 px-3 py-1 text-xs font-semibold text-white">
                  {activeIndex + 1} / {slides.length}
                </span>
              </div>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {slides.map((slide, index) => (
              <div
                key={slide.key}
                className={`rounded-2xl border bg-white p-2 ${
                  activeIndex === index ? "border-purple-400 ring-2 ring-purple-100" : "border-purple-100"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className="w-full overflow-hidden rounded-xl"
                >
                  <img src={slide.src} alt={slide.label} className="h-20 w-full object-cover" />
                </button>
                <p className="mt-2 truncate text-xs font-medium text-gray-600">{slide.label}</p>
                <button
                  type="button"
                  onClick={() =>
                    slide.kind === "saved" ? onRemoveSaved(slide.index) : onRemoveNew(slide.index)
                  }
                  className="mt-2 w-full rounded-xl border border-rose-200 bg-rose-50 px-2 py-1.5 text-xs font-semibold text-rose-700"
                >
                  Quitar
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-purple-200 bg-white/70 px-4 py-8 text-center text-sm text-gray-600">
          Aún no has agregado fotos para el carrusel.
        </div>
      )}
    </div>
  );
}

export default function SoyVeterinarioPage() {
  const router = useRouter();
  const [profileType, setProfileType] = useState<ProfileType>("vet");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [showRequestSentCard, setShowRequestSentCard] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [currentRole, setCurrentRole] = useState<ProfileType | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activePanelSection, setActivePanelSection] = useState<ProfilePanelSection>("info");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [reviewStatus, setReviewStatus] = useState<string | null>(null);
  const [reviewMessage, setReviewMessage] = useState<string | null>(null);
  const [pendingDeletePaths, setPendingDeletePaths] = useState<string[]>([]);
  const [accountCurrentEmail, setAccountCurrentEmail] = useState("");
  const [accountNextEmail, setAccountNextEmail] = useState("");
  const [accountSettingsLoading, setAccountSettingsLoading] = useState(false);
  const [showTermsDialog, setShowTermsDialog] = useState(false);

  const [showVetPassword, setShowVetPassword] = useState(false);
  const [showVetConfirmPassword, setShowVetConfirmPassword] = useState(false);
  const [showClinicPassword, setShowClinicPassword] = useState(false);
  const [showClinicConfirmPassword, setShowClinicConfirmPassword] = useState(false);
  const termsDocument = legalDocuments.terms;

  const [vetForm, setVetForm] = useState({
    firstName: "",
    lastName: "",
    sex: "",
    age: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
    termsAccepted: false,
    city: "",
    address: "",
    homeServiceAreas: [] as HomeServiceArea[],
    about: "",
    professionalCardNumber: "",
    professionalCardFile: null as File | null,
    professionalCardUrl: "",
    specialties: [] as string[],
    specialtyFiles: {} as Record<string, File | null>,
    specialtyDocumentUrls: {} as Record<string, string>,
    consultationCost: "",
    schedule: createEmptySchedule() as ScheduleValue,
    experience: "",
    university: "",
    otherUniversities: [] as OtherUniversityItem[],
    languages: "",
    awards: "",
    publicationLinks: [] as PublicationItem[],
    socialLinks: {
      instagram: "",
      facebook: "",
      twitter: "",
      linkedin: "",
    },
    profilePhoto: null as File | null,
    profilePhotoUrl: "",
    professionalPhotos: [] as File[],
    professionalPhotoUrls: [] as string[],
    otherSpecialties: "",
    otherSpecialtyName: "",
  });

  const [clinicForm, setClinicForm] = useState({
    logoFile: null as File | null,
    logoUrl: "",
    clinicName: "",
    professionalsCount: "",
    city: "",
    addresses: [""],
    firstName: "",
    lastName: "",
    sex: "",
    age: "",
    phone: "",
    role: "",
    socialLinks: {
      instagram: "",
      facebook: "",
      twitter: "",
      linkedin: "",
    },
    email: "",
    emailConfirmation: "",
    password: "",
    confirmPassword: "",
    termsAccepted: false,
    authorizationAccepted: false,
    about: "",
    consultationCost: "",
    schedule: createEmptySchedule() as ScheduleValue,
    services: [] as string[],
    otherService: "",
    rutFile: null as File | null,
    rutUrl: "",
    mercantileRegistryFile: null as File | null,
    mercantileRegistryUrl: "",
    icaRegistryFile: null as File | null,
    icaRegistryUrl: "",
    professionalCardFile: null as File | null,
    professionalCardUrl: "",
    undergraduateDiplomaFile: null as File | null,
    undergraduateDiplomaUrl: "",
  });

  useEffect(() => {
    let isMounted = true;

    const loadSession = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;

      if (!isMounted) return;

      if (!user) {
        setSessionChecked(true);
        return;
      }
      setCurrentUserId(user.id);
      setAccountCurrentEmail(user.email ?? "");
      setAccountNextEmail(user.email ?? "");

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profileError || !profile) {
        setSessionChecked(true);
        return;
      }

      if (profile.role === "vet" || profile.role === "clinic") {
        setCurrentRole(profile.role);
        setProfileType(profile.role);
        setActivePanelSection("info");

        if (profile.role === "vet") {
          const { data: vetProfile } = await supabase
            .from("vet_profiles")
            .select("*")
            .eq("id", user.id)
            .single();

          if (vetProfile && isMounted) {
            const loadedSpecialties = ensureStringArray(vetProfile.specialties);
            const specialtyDocUrls: Record<string, string> = {};
            if (Array.isArray(vetProfile.specialty_documents)) {
              vetProfile.specialty_documents.forEach((doc: { specialty?: string; url?: string }) => {
                if (doc?.specialty && doc?.url) {
                  specialtyDocUrls[doc.specialty] = doc.url;
                }
              });
            }
            const unknownSpecialty = loadedSpecialties.find(
              (item) => !vetSpecialties.includes(item),
            );
            const normalizedSpecialties = unknownSpecialty
              ? loadedSpecialties.map((item) =>
                  item === unknownSpecialty ? OTHER_SPECIALTY_LABEL : item,
                )
              : loadedSpecialties;

            setVetForm((prev) => ({
              ...prev,
              firstName: vetProfile.first_name ?? prev.firstName,
              lastName: vetProfile.last_name ?? prev.lastName,
              sex: vetProfile.sex ?? prev.sex,
              age: vetProfile.age ? String(vetProfile.age) : prev.age,
              phone: vetProfile.phone ?? prev.phone,
              city: vetProfile.city ?? prev.city,
              address: vetProfile.address ?? prev.address,
              homeServiceAreas: parseHomeServiceAreas(vetProfile.home_service_areas),
              about: vetProfile.about ?? prev.about,
              professionalCardNumber: vetProfile.professional_card_number ?? prev.professionalCardNumber,
              specialties: normalizedSpecialties,
              consultationCost: formatConsultationCost(
                String(vetProfile.consultation_cost ?? prev.consultationCost ?? ""),
              ),
              schedule:
                typeof vetProfile.hours === "string"
                  ? (() => {
                      try {
                        const parsed = JSON.parse(vetProfile.hours);
                        return parsed?.slots ? parsed : prev.schedule;
                      } catch {
                        return prev.schedule;
                      }
                    })()
                  : prev.schedule,
              experience: vetProfile.experience ?? prev.experience,
              university: vetProfile.university ?? prev.university,
              otherUniversities: parseOtherUniversities(vetProfile.other_universities),
              languages: vetProfile.languages ?? prev.languages,
              awards: vetProfile.awards ?? prev.awards,
              publicationLinks: parsePublicationLinks(vetProfile.publication_links),
              socialLinks:
                typeof vetProfile.social_links === "string"
                  ? (() => {
                      try {
                        return JSON.parse(vetProfile.social_links);
                      } catch {
                        return prev.socialLinks;
                      }
                    })()
                  : typeof vetProfile.social_links === "object" && vetProfile.social_links
                  ? (vetProfile.social_links as Record<string, string>)
                  : prev.socialLinks,
              professionalCardUrl: vetProfile.professional_card_file_url ?? prev.professionalCardUrl,
              profilePhotoUrl:
                vetProfile.profile_photo_url ?? vetProfile.image_url ?? prev.profilePhotoUrl,
              professionalPhotoUrls: ensureStringArray(vetProfile.professional_photos),
              specialtyDocumentUrls: specialtyDocUrls,
              otherSpecialtyName: unknownSpecialty ?? prev.otherSpecialtyName,
            }));
          }
        }

        if (profile.role === "clinic") {
          const { data: clinicProfile } = await supabase
            .from("clinic_profiles")
            .select("*")
            .eq("id", user.id)
            .single();

          if (clinicProfile && isMounted) {
            const loadedServices = ensureStringArray(clinicProfile.services);
            const unknownService = loadedServices.find(
              (item) => !clinicServices.includes(item),
            );
            const normalizedServices = unknownService
              ? loadedServices.map((item) =>
                  item === unknownService ? OTHER_SPECIALTY_LABEL : item,
                )
              : loadedServices;

            setClinicForm((prev) => ({
              ...prev,
              logoUrl: clinicProfile.logo_url ?? prev.logoUrl,
              clinicName: clinicProfile.clinic_name ?? prev.clinicName,
              professionalsCount: clinicProfile.professionals_count
                ? String(clinicProfile.professionals_count)
                : prev.professionalsCount,
              city: clinicProfile.city ?? prev.city,
              addresses:
                Array.isArray(clinicProfile.addresses) && clinicProfile.addresses.length > 0
                  ? ensureStringArray(clinicProfile.addresses)
                  : clinicProfile.address
                  ? [clinicProfile.address]
                  : prev.addresses,
              firstName: clinicProfile.first_name ?? prev.firstName,
              lastName: clinicProfile.last_name ?? prev.lastName,
              sex: clinicProfile.sex ?? prev.sex,
              age: clinicProfile.age ? String(clinicProfile.age) : prev.age,
              phone: clinicProfile.phone ?? prev.phone,
              role: clinicProfile.role ?? prev.role,
              socialLinks:
                typeof clinicProfile.social_links === "string"
                  ? (() => {
                      try {
                        return JSON.parse(clinicProfile.social_links);
                      } catch {
                        return prev.socialLinks;
                      }
                    })()
                  : typeof clinicProfile.social_links === "object" && clinicProfile.social_links
                  ? (clinicProfile.social_links as Record<string, string>)
                  : prev.socialLinks,
              about: clinicProfile.about ?? prev.about,
              consultationCost: formatConsultationCost(
                String(clinicProfile.consultation_cost ?? prev.consultationCost ?? ""),
              ),
              schedule:
                typeof clinicProfile.hours === "string"
                  ? (() => {
                      try {
                        const parsed = JSON.parse(clinicProfile.hours);
                        return parsed?.slots ? parsed : prev.schedule;
                      } catch {
                        return prev.schedule;
                      }
                    })()
                  : prev.schedule,
              services: normalizedServices,
              otherService: unknownService ?? clinicProfile.other_service ?? prev.otherService,
              rutUrl: clinicProfile.rut_file_url ?? prev.rutUrl,
              mercantileRegistryUrl:
                clinicProfile.compliance_documents?.mercantile_registry_url ??
                prev.mercantileRegistryUrl,
              icaRegistryUrl:
                clinicProfile.compliance_documents?.ica_registry_url ?? prev.icaRegistryUrl,
              professionalCardUrl:
                clinicProfile.compliance_documents?.professional_card_url ?? prev.professionalCardUrl,
              undergraduateDiplomaUrl:
                clinicProfile.compliance_documents?.undergraduate_diploma_url ??
                prev.undergraduateDiplomaUrl,
            }));
          }
        }

        const { data: latestRequest, error: latestRequestError } = await supabase
          .from("verification_requests")
          .select("status, review_message, submitted_at")
          .eq("profile_id", user.id)
          .order("submitted_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!latestRequestError && latestRequest && isMounted) {
          setReviewStatus(latestRequest.status ?? null);
          setReviewMessage(latestRequest.review_message ?? null);
        }
      }

      setSessionChecked(true);
    };

    loadSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const isInitialStep = sessionChecked && !currentRole;
  const vetPasswordsMismatch =
    isInitialStep &&
    profileType === "vet" &&
    vetForm.password.length > 0 &&
    vetForm.confirmPassword.length > 0 &&
    vetForm.password !== vetForm.confirmPassword;
  const clinicPasswordsMismatch =
    isInitialStep &&
    profileType === "clinic" &&
    clinicForm.password.length > 0 &&
    clinicForm.confirmPassword.length > 0 &&
    clinicForm.password !== clinicForm.confirmPassword;
  const vetAboutTooLong = vetForm.about.length > ABOUT_MAX_CHARS;
  const clinicAboutTooLong = clinicForm.about.length > ABOUT_MAX_CHARS;
  const initialTermsAccepted = profileType === "vet" ? vetForm.termsAccepted : clinicForm.termsAccepted;

  const toggleVetSpecialty = (value: string) => {
    setVetForm((prev) => ({
      ...prev,
      specialties: prev.specialties.includes(value)
        ? prev.specialties.filter((item) => item !== value)
        : [...prev.specialties, value],
      specialtyFiles: prev.specialties.includes(value)
        ? Object.fromEntries(
            Object.entries(prev.specialtyFiles).filter(([key]) => key !== value),
          )
        : prev.specialtyFiles,
      otherSpecialtyName:
        value === OTHER_SPECIALTY_LABEL && prev.specialties.includes(value)
          ? ""
          : prev.otherSpecialtyName,
    }));
  };

  const toggleClinicService = (value: string) => {
    setClinicForm((prev) => ({
      ...prev,
      services: prev.services.includes(value)
        ? prev.services.filter((item) => item !== value)
        : [...prev.services, value],
      otherService:
        value === OTHER_SPECIALTY_LABEL && prev.services.includes(value)
          ? ""
          : prev.otherService,
    }));
  };

  const normalizePhone = (value: string) => value.replace(/\D/g, "").slice(0, 10);
  const normalizeConsultationCost = (value: string) =>
    value.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  const formatConsultationCost = (value: string) => {
    const digits = normalizeConsultationCost(value);
    if (!digits) return "";
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const handleVetConsultationCostChange = (value: string) =>
    setVetForm((prev) => ({
      ...prev,
      consultationCost: formatConsultationCost(value),
    }));

  const handleClinicConsultationCostChange = (value: string) =>
    setClinicForm((prev) => ({
      ...prev,
      consultationCost: formatConsultationCost(value),
    }));

  const addClinicAddress = () =>
    setClinicForm((prev) => ({ ...prev, addresses: [...prev.addresses, ""] }));

  const updateClinicAddress = (index: number, value: string) =>
    setClinicForm((prev) => {
      const next = [...prev.addresses];
      next[index] = value;
      return { ...prev, addresses: next };
    });

  const removeClinicAddress = (index: number) =>
    setClinicForm((prev) => ({
      ...prev,
      addresses: prev.addresses.filter((_, idx) => idx !== index),
    }));

  const addOtherUniversity = () =>
    setVetForm((prev) => ({
      ...prev,
      otherUniversities: [
        ...prev.otherUniversities,
        { degreeType: otherUniversityDegreeOptions[0], title: "" },
      ],
    }));

  const updateOtherUniversity = (
    index: number,
    field: keyof OtherUniversityItem,
    value: string,
  ) =>
    setVetForm((prev) => {
      const next = [...prev.otherUniversities];
      const current = next[index] ?? {
        degreeType: otherUniversityDegreeOptions[0],
        title: "",
      };
      next[index] = { ...current, [field]: value };
      return { ...prev, otherUniversities: next };
    });

  const removeOtherUniversity = (index: number) =>
    setVetForm((prev) => ({
      ...prev,
      otherUniversities: prev.otherUniversities.filter((_, idx) => idx !== index),
    }));

  const addPublicationLink = () =>
    setVetForm((prev) => ({
      ...prev,
      publicationLinks: [...prev.publicationLinks, { title: "", url: "" }],
    }));

  const updatePublicationLink = (
    index: number,
    field: keyof PublicationItem,
    value: string,
  ) =>
    setVetForm((prev) => {
      const next = [...prev.publicationLinks];
      const current = next[index] ?? { title: "", url: "" };
      next[index] = { ...current, [field]: value };
      return { ...prev, publicationLinks: next };
    });

  const removePublicationLink = (index: number) =>
    setVetForm((prev) => ({
      ...prev,
      publicationLinks: prev.publicationLinks.filter((_, idx) => idx !== index),
    }));

  const addProfessionalPhoto = (file: File | null) => {
    if (!file) return;
    setVetForm((prev) => ({ ...prev, professionalPhotos: [...prev.professionalPhotos, file] }));
  };

  const removeProfessionalPhoto = (index: number) =>
    setVetForm((prev) => ({
      ...prev,
      professionalPhotos: prev.professionalPhotos.filter((_, idx) => idx !== index),
    }));

  const removeSavedProfessionalPhoto = (index: number) =>
    setVetForm((prev) => {
      const removedUrl = prev.professionalPhotoUrls[index];
      queueDeleteUrl(removedUrl);
      return {
        ...prev,
        professionalPhotoUrls: prev.professionalPhotoUrls.filter((_, idx) => idx !== index),
      };
    });

  const resolveVetSpecialtyLabel = (specialty: string) => {
    if (specialty !== OTHER_SPECIALTY_LABEL) return specialty;
    return vetForm.otherSpecialtyName.trim() || specialty;
  };

  const resolveClinicServiceLabel = (service: string) => {
    if (service !== OTHER_SPECIALTY_LABEL) return service;
    return clinicForm.otherService.trim() || service;
  };

  const toggleHomeServiceArea = (area: HomeServiceArea) =>
    setVetForm((prev) => {
      const hasArea = prev.homeServiceAreas.includes(area);
      const nextAreas = hasArea
        ? prev.homeServiceAreas.filter((item) => item !== area)
        : [...prev.homeServiceAreas, area];
      return { ...prev, homeServiceAreas: nextAreas };
    });

  const resolvedVetSpecialties = vetForm.specialties
    .map((specialty) => resolveVetSpecialtyLabel(specialty))
    .filter(Boolean);
  const resolvedClinicServices = clinicForm.services
    .map((service) => resolveClinicServiceLabel(service))
    .filter(Boolean);

  const vetPreviewData: PreviewProfileData = {
    name: `${vetForm.firstName} ${vetForm.lastName}`.trim() || "Nombre del veterinario",
    type: resolvedVetSpecialties[0] || "Veterinario",
    specialties: resolvedVetSpecialties,
    city: vetForm.city,
    experience: vetForm.experience,
    phone: vetForm.phone,
    consultationCost: vetForm.consultationCost,
    imageFile: vetForm.profilePhoto,
    imageUrl: vetForm.profilePhotoUrl,
    verified: reviewStatus === "approved",
    about: vetForm.about,
    address: vetForm.address,
    schedule: formatScheduleForPreview(vetForm.schedule),
    socialLinks: vetForm.socialLinks,
    publicationLinks: vetForm.publicationLinks.filter((item) => item.url.trim().length > 0),
    detailItems: [
      vetForm.experience ? { label: "Años de experiencia", value: vetForm.experience } : null,
      vetForm.university ? { label: "Universidad Pregrado", value: vetForm.university } : null,
      vetForm.otherUniversities.length > 0
        ? {
            label: "Otras universidades",
            value: vetForm.otherUniversities.map((item) => formatOtherUniversity(item)).filter(Boolean).join(", "),
          }
        : null,
      vetForm.languages ? { label: "Idiomas", value: vetForm.languages } : null,
      vetForm.awards ? { label: "Premios", value: vetForm.awards } : null,
      vetForm.homeServiceAreas.length > 0
        ? { label: "Zonas de atención domiciliaria", value: formatHomeServiceAreas(vetForm.homeServiceAreas) }
        : null,
    ].filter((item): item is { label: string; value: string } => Boolean(item)),
    isClinic: false,
    carouselSavedUrls: vetForm.professionalPhotoUrls,
    carouselNewFiles: vetForm.professionalPhotos,
  };

  const clinicPreviewData: PreviewProfileData = {
    name: clinicForm.clinicName || "Nombre de la clínica",
    type: "Clínica Veterinaria",
    specialties: resolvedClinicServices,
    city: clinicForm.city,
    experience: "",
    phone: clinicForm.phone,
    consultationCost: clinicForm.consultationCost,
    imageFile: clinicForm.logoFile,
    imageUrl: clinicForm.logoUrl,
    verified: reviewStatus === "approved",
    about: clinicForm.about,
    address: clinicForm.addresses.find((item) => item.trim().length > 0) ?? "",
    schedule: formatScheduleForPreview(clinicForm.schedule),
    socialLinks: clinicForm.socialLinks,
    publicationLinks: [],
    detailItems: [
      clinicForm.professionalsCount
        ? { label: "Número de profesionales", value: clinicForm.professionalsCount }
        : null,
      clinicForm.firstName || clinicForm.lastName
        ? { label: "Responsable", value: `${clinicForm.firstName} ${clinicForm.lastName}`.trim() }
        : null,
      clinicForm.role ? { label: "Cargo", value: clinicForm.role } : null,
      clinicForm.addresses.filter((item) => item.trim().length > 0).length > 0
        ? {
            label: "Sedes",
            value: clinicForm.addresses.filter((item) => item.trim().length > 0).join(" · "),
          }
        : null,
    ].filter((item): item is { label: string; value: string } => Boolean(item)),
    isClinic: true,
    carouselSavedUrls: [],
    carouselNewFiles: [],
  };

  const uploadProfileFile = async (file: File, path: string) => {
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new Error("FILE_TOO_LARGE");
    }
    const { error } = await supabase.storage
      .from("profile-uploads")
      .upload(path, file, { upsert: true });

    if (error) {
      throw error;
    }

    const { data } = supabase.storage.from("profile-uploads").getPublicUrl(path);
    return data.publicUrl;
  };

  const getStoragePathFromUrl = (url: string) => {
    if (!url) return "";
    const marker = "/storage/v1/object/public/profile-uploads/";
    const index = url.indexOf(marker);
    if (index === -1) return "";
    return url.slice(index + marker.length);
  };

  const deleteStoragePaths = async (paths: string[]) => {
    const cleaned = paths.map((item) => item.trim()).filter(Boolean);
    if (cleaned.length === 0) return;
    await fetch("/api/storage-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paths: cleaned }),
    });
  };

  const queueDeleteUrl = (url?: string | null) => {
    if (!url) return;
    const path = getStoragePathFromUrl(url);
    if (!path) return;
    setPendingDeletePaths((prev) => (prev.includes(path) ? prev : [...prev, path]));
  };

  const sanitizeFilename = (name: string) =>
    name
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase();

  const getFileExtension = (name: string) => {
    const trimmed = name.trim();
    const lastDot = trimmed.lastIndexOf(".");
    if (lastDot <= 0 || lastDot === trimmed.length - 1) return "";
    return trimmed.slice(lastDot + 1).toLowerCase();
  };

  const buildFileName = (base: string, originalName: string) => {
    const extension = getFileExtension(originalName);
    const safeBase = sanitizeFilename(base);
    if (!extension) return safeBase;
    return `${safeBase}.${sanitizeFilename(extension)}`;
  };

  const toOwnerKey = (value: string) => {
    const sanitized = sanitizeFilename(value || "");
    const firstChunk = sanitized.split("-")[0];
    return firstChunk || "usuario";
  };

  const buildCategoryFileName = (category: string, owner: string, originalName: string) =>
    buildFileName(`${category}_${toOwnerKey(owner)}`, originalName);

  const buildInputId = (prefix: string, value: string) =>
    `${prefix}-${sanitizeFilename(value)}`;

  const formatUploadError = (label: string, error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    const lower = message.toLowerCase();
    if (message.toLowerCase().includes("invalid key")) {
      return `No pudimos subir ${label} porque el nombre del archivo tiene caracteres no válidos. Intenta con otro archivo.`;
    }
    if (lower.includes("bucket") && lower.includes("not found")) {
      return `No pudimos subir ${label} porque el bucket "profile-uploads" no existe en Supabase Storage.`;
    }
    if (lower.includes("permission") || lower.includes("unauthorized") || lower.includes("403")) {
      return `No pudimos subir ${label} por permisos de Storage (403). Revisa las políticas de Supabase Storage.`;
    }
    if (lower.includes("file_too_large")) {
      return `El archivo supera ${MAX_UPLOAD_MB}MB. Por favor comprímelo y vuelve a intentarlo.`;
    }
    return `No pudimos subir ${label}. Intenta de nuevo.`;
  };

  const getSignUpErrorMessage = (message?: string | null) => {
    const normalized = (message ?? "").toLowerCase();
    if (normalized.includes("error sending confirmation email")) {
      return "No pudimos enviar el correo de confirmacion. Revisa la configuracion de correo en Supabase e intenta de nuevo.";
    }
    if (normalized.includes("email rate limit")) {
      return "Demasiados intentos de registro. Espera unos minutos e intenta de nuevo.";
    }
    if (normalized.includes("user already registered")) {
      return "Este correo ya esta registrado. Intenta iniciar sesion.";
    }
    return message || "No se pudo crear la cuenta.";
  };

  const getEmailRedirectUrl = () => {
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "").trim().replace(/\/$/, "");
    if (siteUrl) return `${siteUrl}/auth/callback`;
    if (typeof window !== "undefined") return `${window.location.origin}/auth/callback`;
    return undefined;
  };

  const getResetPasswordRedirectUrl = () => {
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "").trim().replace(/\/$/, "");
    if (siteUrl) return `${siteUrl}/reset-password`;
    if (typeof window !== "undefined") return `${window.location.origin}/reset-password`;
    return undefined;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    if (profileType === "vet") {
      if (!vetForm.termsAccepted) {
        setError("Debes aceptar los términos y condiciones para enviar la solicitud.");
        setLoading(false);
        return;
      }

      if (vetForm.password !== vetForm.confirmPassword) {
        setError("Las contraseñas no coinciden.");
        setLoading(false);
        return;
      }

      if (normalizePhone(vetForm.phone).length !== 10) {
        setError("El teléfono debe tener 10 dígitos.");
        setLoading(false);
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: vetForm.email,
        password: vetForm.password,
        options: {
          emailRedirectTo: getEmailRedirectUrl(),
        },
      });

      if (signUpError || !data.user) {
        setError(getSignUpErrorMessage(signUpError?.message));
        setLoading(false);
        return;
      }

      const userId = data.user.id;

      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "vet",
          userId,
          email: vetForm.email,
          vetProfile: {
            firstName: vetForm.firstName,
            lastName: vetForm.lastName,
            sex: vetForm.sex,
            age: vetForm.age,
            phone: normalizePhone(vetForm.phone),
            city: vetForm.city,
          },
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data?.error || "No se pudo crear el perfil.");
        setLoading(false);
        return;
      }
    } else {
      if (!clinicForm.termsAccepted) {
        setError("Debes aceptar los términos y condiciones para enviar la solicitud.");
        setLoading(false);
        return;
      }

      if (clinicForm.password !== clinicForm.confirmPassword) {
        setError("Las contraseñas no coinciden.");
        setLoading(false);
        return;
      }

      if (normalizePhone(clinicForm.phone).length !== 10) {
        setError("El teléfono debe tener 10 dígitos.");
        setLoading(false);
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: clinicForm.email,
        password: clinicForm.password,
        options: {
          emailRedirectTo: getEmailRedirectUrl(),
        },
      });

      if (signUpError || !data.user) {
        setError(getSignUpErrorMessage(signUpError?.message));
        setLoading(false);
        return;
      }

      const userId = data.user.id;

      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "clinic",
          userId,
          email: clinicForm.email,
          clinicProfile: {
            clinicName: clinicForm.clinicName,
            phone: normalizePhone(clinicForm.phone),
            city: clinicForm.city,
          },
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data?.error || "No se pudo crear el perfil.");
        setLoading(false);
        return;
      }
    }

    setLoading(false);
    setInfo("Revisa tu correo y confirma tu cuenta. Luego podrás completar tu perfil.");
    setShowRequestSentCard(true);
  };

  const handleCompleteProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;

    if (!user || !currentRole) {
      setLoading(false);
      router.push("/login");
      return;
    }

    if (currentRole === "vet") {
      const hasSchedule =
        vetForm.schedule.is24h ||
        weekDays.some((day) => (vetForm.schedule.slots[day] ?? []).length > 0);

      if (!vetForm.professionalCardNumber.trim()) {
        setError("El numero de tarjeta profesional es obligatorio.");
        setLoading(false);
        return;
      }

      if (!vetForm.professionalCardFile && !vetForm.professionalCardUrl) {
        setError("Debes subir el documento de la tarjeta profesional.");
        setLoading(false);
        return;
      }

      const normalizedVetConsultationCost = normalizeConsultationCost(vetForm.consultationCost);
      if (!normalizedVetConsultationCost) {
        setError("El costo de consulta debe ser un valor numerico.");
        setLoading(false);
        return;
      }

      if (!hasSchedule) {
        setError("Selecciona al menos un horario o activa 24 horas.");
        setLoading(false);
        return;
      }

      if (vetForm.specialties.length === 0) {
        setError("Selecciona minimo un enfasis medico.");
        setLoading(false);
        return;
      }

      const missingSpecialty = vetForm.specialties.find(
        (specialty) =>
          !isCertificateOptionalForSpecialty(resolveVetSpecialtyLabel(specialty)) &&
          !vetForm.specialtyFiles[specialty] &&
          !vetForm.specialtyDocumentUrls[resolveVetSpecialtyLabel(specialty)],
      );
      if (missingSpecialty) {
        setError(`Falta el titulo para ${missingSpecialty}.`);
        setLoading(false);
        return;
      }

      if (!vetForm.university.trim()) {
        setError("La universidad de pregrado es obligatoria.");
        setLoading(false);
        return;
      }

      if (!vetForm.profilePhoto && !vetForm.profilePhotoUrl) {
        setError("Debes subir una foto de perfil.");
        setLoading(false);
        return;
      }

      try {
        const ownerName = vetForm.firstName || "veterinario";
        const filesToDelete: string[] = [...pendingDeletePaths];
        const professionalCardUrl = vetForm.professionalCardFile
          ? await uploadProfileFile(
              vetForm.professionalCardFile,
              `${user.id}/documents/${buildCategoryFileName(
                "TarjetaProfesional",
                ownerName,
                vetForm.professionalCardFile.name,
              )}`,
            )
          : vetForm.professionalCardUrl;
        if (vetForm.professionalCardUrl && vetForm.professionalCardUrl !== professionalCardUrl) {
          const path = getStoragePathFromUrl(vetForm.professionalCardUrl);
          if (path) filesToDelete.push(path);
        }

        const profilePhotoUrl = vetForm.profilePhoto
          ? await uploadProfileFile(
              vetForm.profilePhoto,
              `${user.id}/photos/${buildCategoryFileName(
                "FotoPerfil",
                ownerName,
                vetForm.profilePhoto.name,
              )}`,
            )
          : vetForm.profilePhotoUrl;
        if (vetForm.profilePhotoUrl && vetForm.profilePhotoUrl !== profilePhotoUrl) {
          const path = getStoragePathFromUrl(vetForm.profilePhotoUrl);
          if (path) filesToDelete.push(path);
        }

        const newProfessionalPhotoUrls = await Promise.all(
          vetForm.professionalPhotos.map((file, index) =>
            uploadProfileFile(
              file,
              `${user.id}/photos/${buildCategoryFileName(
                `FotoProfesional_${index + 1}`,
                ownerName,
                file.name,
              )}`,
            ),
          ),
        );
        const professionalPhotoUrls = [
          ...vetForm.professionalPhotoUrls.filter(Boolean),
          ...newProfessionalPhotoUrls,
        ];

        const resolvedVetSpecialties = vetForm.specialties.map((specialty) =>
          resolveVetSpecialtyLabel(specialty),
        );

        const specialtyDocuments = await Promise.all(
          vetForm.specialties.map(async (specialty) => {
            const resolvedLabel = resolveVetSpecialtyLabel(specialty);
            const file = vetForm.specialtyFiles[specialty];
            if (!file) {
              const existingUrl = vetForm.specialtyDocumentUrls[resolvedLabel];
              return existingUrl ? { specialty: resolvedLabel, url: existingUrl } : null;
            }
            const sanitized = resolvedLabel.replace(/\s+/g, "-").toLowerCase();
            const specialtyFileName = buildCategoryFileName(
              `Titulo_${sanitized}`,
              ownerName,
              file.name,
            );
            const url = await uploadProfileFile(
              file,
              `${user.id}/documents/${specialtyFileName}`,
            );
            const existingUrl = vetForm.specialtyDocumentUrls[resolvedLabel];
            if (existingUrl && existingUrl !== url) {
              const path = getStoragePathFromUrl(existingUrl);
              if (path) filesToDelete.push(path);
            }
            return { specialty: resolvedLabel, url };
          }),
        );

        Object.entries(vetForm.specialtyDocumentUrls).forEach(([label, url]) => {
          const stillSelected = vetForm.specialties.some(
            (item) => resolveVetSpecialtyLabel(item) === label,
          );
          if (!stillSelected && url) {
            const path = getStoragePathFromUrl(url);
            if (path) filesToDelete.push(path);
          }
        });

        const cleanedPublicationLinks = vetForm.publicationLinks
          .map((item, index) => {
            const url = item.url.trim();
            if (!url) return null;
            const title = item.title.trim() || `Publicación ${index + 1}`;
            return { title, url };
          })
          .filter((item): item is PublicationItem => Boolean(item));

        const { error: updateError } = await supabase
          .from("vet_profiles")
          .update({
            first_name: vetForm.firstName,
            last_name: vetForm.lastName,
            city: vetForm.city,
            address: vetForm.address,
            home_service_areas:
              vetForm.homeServiceAreas.length > 0 ? formatHomeServiceAreas(vetForm.homeServiceAreas) : null,
            about: vetForm.about,
            professional_card_number: vetForm.professionalCardNumber,
            professional_card_file_url: professionalCardUrl,
            specialties: resolvedVetSpecialties,
            specialty_documents: specialtyDocuments.filter(Boolean),
            consultation_cost: normalizeConsultationCost(vetForm.consultationCost),
            hours: JSON.stringify(vetForm.schedule),
            experience: vetForm.experience,
            university: vetForm.university,
            other_universities: vetForm.otherUniversities
              .map((item) => formatOtherUniversity(item))
              .filter(Boolean),
            other_specialties: vetForm.otherSpecialties,
            languages: vetForm.languages,
            awards: vetForm.awards,
            publication_links: cleanedPublicationLinks,
            social_links: vetForm.socialLinks,
            profile_photo_url: profilePhotoUrl,
            image_url: profilePhotoUrl,
            professional_photos: professionalPhotoUrls,
            phone: normalizePhone(vetForm.phone) || vetForm.phone,
          })
          .eq("id", user.id);

        if (updateError) {
          setError("No se pudieron guardar los datos del perfil. Intenta de nuevo.");
          setLoading(false);
          return;
        }

        if (filesToDelete.length > 0) {
          await deleteStoragePaths(filesToDelete);
        }
        if (pendingDeletePaths.length > 0) {
          setPendingDeletePaths([]);
        }
      } catch (uploadError) {
        setError(formatUploadError("los documentos o fotos del perfil", uploadError));
        setLoading(false);
        return;
      }
    }

    if (currentRole === "clinic") {
      const addresses = clinicForm.addresses.map((value) => value.trim()).filter(Boolean);
      const hasSchedule =
        clinicForm.schedule.is24h ||
        weekDays.some((day) => (clinicForm.schedule.slots[day] ?? []).length > 0);

      if (addresses.length === 0) {
        setError("La direccion de sede es obligatoria.");
        setLoading(false);
        return;
      }

      const normalizedClinicConsultationCost = normalizeConsultationCost(
        clinicForm.consultationCost,
      );
      if (!normalizedClinicConsultationCost) {
        setError("El costo de consulta debe ser un valor numerico.");
        setLoading(false);
        return;
      }

      if (!clinicForm.mercantileRegistryFile && !clinicForm.mercantileRegistryUrl) {
        setError("Debes subir el registro mercantil.");
        setLoading(false);
        return;
      }
      if (!clinicForm.icaRegistryFile && !clinicForm.icaRegistryUrl) {
        setError("Debes subir el registro ICA.");
        setLoading(false);
        return;
      }
      if (!clinicForm.professionalCardFile && !clinicForm.professionalCardUrl) {
        setError("Debes subir la tarjeta profesional.");
        setLoading(false);
        return;
      }
      if (!clinicForm.undergraduateDiplomaFile && !clinicForm.undergraduateDiplomaUrl) {
        setError("Debes subir el diploma de pregrado.");
        setLoading(false);
        return;
      }

      if (clinicForm.services.length === 0) {
        setError("Selecciona minimo un enfasis medico.");
        setLoading(false);
        return;
      }

      if (!hasSchedule) {
        setError("Selecciona al menos un horario o activa 24 horas.");
        setLoading(false);
        return;
      }

      try {
        const ownerName = clinicForm.clinicName || "clinica";
        const filesToDelete: string[] = [...pendingDeletePaths];
        const logoUrl = clinicForm.logoFile
          ? await uploadProfileFile(
              clinicForm.logoFile,
              `${user.id}/photos/${buildCategoryFileName(
                "Logo",
                ownerName,
                clinicForm.logoFile.name,
              )}`,
            )
          : clinicForm.logoUrl || null;
        if (clinicForm.logoUrl && clinicForm.logoUrl !== logoUrl) {
          const path = getStoragePathFromUrl(clinicForm.logoUrl);
          if (path) filesToDelete.push(path);
        }
        const rutUrl = clinicForm.rutFile
          ? await uploadProfileFile(
              clinicForm.rutFile,
              `${user.id}/documents/${buildCategoryFileName(
                "RUT",
                ownerName,
                clinicForm.rutFile.name,
              )}`,
            )
          : clinicForm.rutUrl || null;
        if (clinicForm.rutUrl && clinicForm.rutUrl !== rutUrl) {
          const path = getStoragePathFromUrl(clinicForm.rutUrl);
          if (path) filesToDelete.push(path);
        }
        const mercantileRegistryUrl = clinicForm.mercantileRegistryFile
          ? await uploadProfileFile(
              clinicForm.mercantileRegistryFile,
              `${user.id}/documents/${buildCategoryFileName(
                "RegistroMercantil",
                ownerName,
                clinicForm.mercantileRegistryFile.name,
              )}`,
            )
          : clinicForm.mercantileRegistryUrl;
        if (
          clinicForm.mercantileRegistryUrl &&
          clinicForm.mercantileRegistryUrl !== mercantileRegistryUrl
        ) {
          const path = getStoragePathFromUrl(clinicForm.mercantileRegistryUrl);
          if (path) filesToDelete.push(path);
        }
        const icaRegistryUrl = clinicForm.icaRegistryFile
          ? await uploadProfileFile(
              clinicForm.icaRegistryFile,
              `${user.id}/documents/${buildCategoryFileName(
                "RegistroICA",
                ownerName,
                clinicForm.icaRegistryFile.name,
              )}`,
            )
          : clinicForm.icaRegistryUrl;
        if (clinicForm.icaRegistryUrl && clinicForm.icaRegistryUrl !== icaRegistryUrl) {
          const path = getStoragePathFromUrl(clinicForm.icaRegistryUrl);
          if (path) filesToDelete.push(path);
        }
        const clinicProfessionalCardUrl = clinicForm.professionalCardFile
          ? await uploadProfileFile(
              clinicForm.professionalCardFile,
              `${user.id}/documents/${buildCategoryFileName(
                "TarjetaProfesional",
                ownerName,
                clinicForm.professionalCardFile.name,
              )}`,
            )
          : clinicForm.professionalCardUrl;
        if (
          clinicForm.professionalCardUrl &&
          clinicForm.professionalCardUrl !== clinicProfessionalCardUrl
        ) {
          const path = getStoragePathFromUrl(clinicForm.professionalCardUrl);
          if (path) filesToDelete.push(path);
        }
        const undergraduateDiplomaUrl = clinicForm.undergraduateDiplomaFile
          ? await uploadProfileFile(
              clinicForm.undergraduateDiplomaFile,
              `${user.id}/documents/${buildCategoryFileName(
                "DiplomaPregrado",
                ownerName,
                clinicForm.undergraduateDiplomaFile.name,
              )}`,
            )
          : clinicForm.undergraduateDiplomaUrl;
        if (
          clinicForm.undergraduateDiplomaUrl &&
          clinicForm.undergraduateDiplomaUrl !== undergraduateDiplomaUrl
        ) {
          const path = getStoragePathFromUrl(clinicForm.undergraduateDiplomaUrl);
          if (path) filesToDelete.push(path);
        }
        const resolvedClinicServices = clinicForm.services.map((service) =>
          resolveClinicServiceLabel(service),
        );

        const clinicPayload = {
          clinic_name: clinicForm.clinicName,
          professionals_count: clinicForm.professionalsCount
            ? Number(clinicForm.professionalsCount)
            : null,
          city: clinicForm.city,
          address: addresses[0] ?? null,
          addresses,
          first_name: clinicForm.firstName,
          last_name: clinicForm.lastName,
          sex: clinicForm.sex,
          phone: normalizePhone(clinicForm.phone) || clinicForm.phone,
          role: clinicForm.role,
          social_links: clinicForm.socialLinks,
          about: clinicForm.about,
          consultation_cost: normalizeConsultationCost(clinicForm.consultationCost),
          hours: JSON.stringify(clinicForm.schedule),
          services: resolvedClinicServices,
          compliance_documents: {
            mercantile_registry_url: mercantileRegistryUrl,
            ica_registry_url: icaRegistryUrl,
            professional_card_url: clinicProfessionalCardUrl,
            undergraduate_diploma_url: undergraduateDiplomaUrl,
          },
          other_service: clinicForm.otherService,
          rut_file_url: rutUrl,
          logo_url: logoUrl,
        };

        let { error: updateError } = await supabase
          .from("clinic_profiles")
          .update(clinicPayload)
          .eq("id", user.id);

        if (
          updateError &&
          (updateError.message.toLowerCase().includes("compliance_documents") ||
            updateError.message.toLowerCase().includes("logo_url") ||
            updateError.message.toLowerCase().includes("social_links"))
        ) {
          const payloadWithoutServiceDocuments = { ...clinicPayload };
          delete (payloadWithoutServiceDocuments as { compliance_documents?: unknown }).compliance_documents;
          delete (payloadWithoutServiceDocuments as { logo_url?: unknown }).logo_url;
          delete (payloadWithoutServiceDocuments as { social_links?: unknown }).social_links;
          const retry = await supabase
            .from("clinic_profiles")
            .update(payloadWithoutServiceDocuments)
            .eq("id", user.id);
          updateError = retry.error;
        }

        if (updateError) {
          setError("No se pudieron guardar los datos de la clinica. Intenta de nuevo.");
          setLoading(false);
          return;
        }

        if (filesToDelete.length > 0) {
          await deleteStoragePaths(filesToDelete);
        }
        if (pendingDeletePaths.length > 0) {
          setPendingDeletePaths([]);
        }
      } catch (uploadError) {
        setError(formatUploadError("los documentos de la clinica", uploadError));
        setLoading(false);
        return;
      }
    }

    await supabase
      .from("profiles")
      .update({ status: "pending", is_public: false })
      .eq("id", user.id);

    const { data: existingRequest, error: existingRequestError } = await supabase
      .from("verification_requests")
      .select("id")
      .eq("profile_id", user.id)
      .limit(1);

    if (existingRequestError) {
      setError("No se pudo actualizar la solicitud de verificacion. Intenta de nuevo.");
      setLoading(false);
      return;
    }

    const submittedAt = new Date().toISOString();

    if (existingRequest && existingRequest.length > 0) {
      const { error: updateRequestError } = await supabase
        .from("verification_requests")
        .update({ status: "pending", submitted_at: submittedAt })
        .eq("profile_id", user.id);

      if (updateRequestError) {
        const { error: fallbackInsertError } = await supabase
          .from("verification_requests")
          .insert({ profile_id: user.id, status: "pending", submitted_at: submittedAt });
        if (fallbackInsertError) {
          setError("No se pudo enviar la solicitud de verificacion. Intenta de nuevo.");
          setLoading(false);
          return;
        }
      }
    } else {
      const { error: insertRequestError } = await supabase
        .from("verification_requests")
        .insert({ profile_id: user.id, status: "pending", submitted_at: submittedAt });
      if (insertRequestError) {
        setError("No se pudo enviar la solicitud de verificacion. Intenta de nuevo.");
        setLoading(false);
        return;
      }
    }

    await fetch("/api/notify-master", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId: user.id }),
    });

    setLoading(false);
    setShowSuccessModal(true);
  };

  const handleUpdateAccountEmail = async () => {
    const normalizedEmail = accountNextEmail.trim().toLowerCase();
    setError(null);
    setInfo(null);

    if (!normalizedEmail) {
      setError("Ingresa un correo electrónico válido.");
      return;
    }

    if (normalizedEmail === accountCurrentEmail.trim().toLowerCase()) {
      setInfo("El nuevo correo es igual al correo actual.");
      return;
    }

    setAccountSettingsLoading(true);
    const { error: authError } = await supabase.auth.updateUser({
      email: normalizedEmail,
    });

    if (authError) {
      setError("No se pudo enviar el magic link para cambiar el correo. Intenta de nuevo.");
      setAccountSettingsLoading(false);
      return;
    }

    setInfo("Te enviamos un magic link para confirmar el cambio de correo.");
    setAccountSettingsLoading(false);
  };

  const handleUpdateAccountPassword = async () => {
    setError(null);
    setInfo(null);

    const normalizedEmail = accountCurrentEmail.trim().toLowerCase();

    if (!normalizedEmail) {
      setError("No encontramos tu correo actual para enviar el enlace.");
      return;
    }

    setAccountSettingsLoading(true);
    const { error: authError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: getResetPasswordRedirectUrl(),
    });

    if (authError) {
      setError("No se pudo enviar el enlace para cambiar la contraseña. Intenta de nuevo.");
      setAccountSettingsLoading(false);
      return;
    }

    setInfo("Te enviamos un enlace para cambiar tu contraseña.");
    setAccountSettingsLoading(false);
  };

  const sidebarItems = currentRole
    ? [
        {
          label: "Informacion",
          icon: ClipboardList,
          onClick: () => setActivePanelSection("info"),
          isActive: activePanelSection === "info",
        },
        {
          label: "Horarios",
          icon: Clock3,
          onClick: () => setActivePanelSection("hours"),
          isActive: activePanelSection === "hours",
        },
        {
          label: "Documentos",
          icon: FolderOpen,
          onClick: () => setActivePanelSection("documents"),
          isActive: activePanelSection === "documents",
        },
        ...(currentRole === "vet"
          ? [
              {
                label: "Carrusel de fotos",
                icon: Images,
                onClick: () => setActivePanelSection("carousel"),
                isActive: activePanelSection === "carousel",
              },
            ]
          : []),
        {
          label: "Vista previa",
          icon: LayoutTemplate,
          onClick: () => setActivePanelSection("preview"),
          isActive: activePanelSection === "preview",
        },
        {
          label: "Configuración",
          icon: Settings,
          onClick: () => setActivePanelSection("settings"),
          isActive: activePanelSection === "settings",
        },
      ]
    : [];
  const sidebarDisplayName =
    currentRole === "clinic"
      ? clinicForm.clinicName?.trim() || "Usuario"
      : `${vetForm.firstName} ${vetForm.lastName}`.trim() || "Usuario";

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-pink-50 to-blue-50 pt-10 pb-12">
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {currentRole ? (
            <PanelSidebar
              eyebrow="Bienvenido"
              title={sidebarDisplayName}
              subtitle={currentRole === "clinic" ? "Clinica veterinaria" : "Veterinario"}
              items={sidebarItems}
            />
          ) : null}
          <div className="flex-1">
            {currentRole && reviewStatus === "changes_requested" ? (
              <div className="mb-6 rounded-3xl border border-rose-200 bg-rose-50/80 p-5 text-rose-700 shadow-sm">
                <p className="text-sm font-semibold">Se solicitaron cambios en tu perfil</p>
                <p className="mt-2 text-sm text-rose-600">
                  {reviewMessage?.trim() || "Revisa la informacion y actualiza los datos solicitados."}
                </p>
              </div>
            ) : null}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="max-w-5xl mx-auto"
            >
          {isInitialStep && !showRequestSentCard ? (
            <div className="flex flex-col md:flex-row gap-4 justify-center mb-8">
              <button
                type="button"
                onClick={() => setProfileType("vet")}
                className={`px-6 py-3 rounded-full font-semibold transition ${
                  profileType === "vet"
                    ? "bg-gradient-to-r from-[#EC4899] to-[#4F46E5] text-white shadow-lg"
                    : "bg-white/70 text-gray-700 border border-white/60"
                }`}
              >
                Veterinario
              </button>
              <button
                type="button"
                onClick={() => setProfileType("clinic")}
                className={`px-6 py-3 rounded-full font-semibold transition ${
                  profileType === "clinic"
                    ? "bg-gradient-to-r from-[#EC4899] to-[#4F46E5] text-white shadow-lg"
                    : "bg-white/70 text-gray-700 border border-white/60"
                }`}
              >
                Clinica Veterinaria
              </button>
            </div>
          ) : null}

          {!sessionChecked ? (
            <div className="rounded-[2rem] border border-white/50 bg-white/60 p-5 text-center text-gray-600 shadow-2xl backdrop-blur-xl sm:rounded-[3rem] sm:p-8 md:p-10">
              Cargando...
            </div>
          ) : isInitialStep && showRequestSentCard ? (
            <div className="rounded-[2rem] border border-white/50 bg-white/60 p-5 shadow-2xl backdrop-blur-xl sm:rounded-[3rem] sm:p-8 md:p-10">
              <div className="mx-auto max-w-xl rounded-3xl border border-purple-200/80 bg-gradient-to-br from-purple-50 via-white to-fuchsia-50 p-8 text-center shadow-xl shadow-purple-500/10">
                <div className="mx-auto mb-4 w-fit rounded-2xl bg-gradient-to-r from-[#EC4899] to-[#4F46E5] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-purple-500/30">
                  Registro profesional
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-3">
                  Solicitud <span className="bg-gradient-to-r from-[#EC4899] to-[#4F46E5] bg-clip-text text-transparent">enviada</span>
                </h2>
                <p className="text-base text-gray-600">
                  Revisa tu correo y confirma tu cuenta. Luego podrás completar tu perfil.
                </p>
                <button
                  type="button"
                  onClick={() => router.push("/login")}
                  className="mt-6 inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-[#EC4899] to-[#4F46E5] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/30 transition hover:shadow-xl hover:shadow-purple-500/40"
                >
                  Ir a iniciar sesion
                </button>
              </div>
            </div>
          ) : (
            <form
              onSubmit={isInitialStep ? handleSubmit : handleCompleteProfile}
              className="rounded-[2rem] border border-white/50 bg-white/60 p-5 shadow-2xl backdrop-blur-xl sm:rounded-[3rem] sm:p-8 md:p-10"
            >
              {isInitialStep ? (
                profileType === "vet" ? (
                  <div className="space-y-8">
                    <section>
                      <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl flex items-center justify-center">
                          <User className="w-5 h-5 text-white" />
                        </div>
                        Datos personales
                      </h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Nombres</label>
                          <input
                            value={vetForm.firstName}
                            onChange={(e) => setVetForm({ ...vetForm, firstName: e.target.value })}
                            className="w-full px-4 py-3 border-2 border-purple-100 rounded-2xl focus:border-[#7C3AED] focus:outline-none focus:ring-4 focus:ring-purple-100 transition-all bg-white/50"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Apellidos</label>
                          <input
                            value={vetForm.lastName}
                            onChange={(e) => setVetForm({ ...vetForm, lastName: e.target.value })}
                            className="w-full px-4 py-3 border-2 border-purple-100 rounded-2xl focus:border-[#7C3AED] focus:outline-none focus:ring-4 focus:ring-purple-100 transition-all bg-white/50"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Sexo</label>
                          <select
                            value={vetForm.sex}
                            onChange={(e) => setVetForm({ ...vetForm, sex: e.target.value })}
                            className="w-full px-4 py-3 border-2 border-purple-100 rounded-2xl bg-white/50"
                            required
                          >
                            <option value="">Selecciona</option>
                            {sexOptions.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Edad</label>
                          <input
                            type="number"
                            min={1}
                            max={100}
                            value={vetForm.age}
                            onChange={(e) => setVetForm({ ...vetForm, age: e.target.value })}
                            className="w-full px-4 py-3 border-2 border-purple-100 rounded-2xl bg-white/50"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Telefono de contacto</label>
                          <input
                            type="tel"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            minLength={10}
                            maxLength={10}
                            value={vetForm.phone}
                            onChange={(e) =>
                              setVetForm({ ...vetForm, phone: normalizePhone(e.target.value) })
                            }
                            className="w-full px-4 py-3 border-2 border-purple-100 rounded-2xl bg-white/50"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Ciudad de residencia</label>
                          <select
                            value={vetForm.city}
                            onChange={(e) => setVetForm({ ...vetForm, city: e.target.value })}
                            className="w-full px-4 py-3 border-2 border-purple-100 rounded-2xl bg-white/50"
                            required
                          >
                            <option value="">Selecciona</option>
                            {cities.map((city) => (
                              <option key={city} value={city}>
                                {city}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Correo</label>
                          <input
                            type="email"
                            value={vetForm.email}
                            onChange={(e) => setVetForm({ ...vetForm, email: e.target.value })}
                            className="w-full px-4 py-3 border-2 border-purple-100 rounded-2xl bg-white/50"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Contraseña</label>
                          <div className="relative">
                            <input
                              type={showVetPassword ? "text" : "password"}
                              value={vetForm.password}
                              onChange={(e) => setVetForm({ ...vetForm, password: e.target.value })}
                              className={`w-full px-4 py-3 border-2 rounded-2xl bg-white/50 pr-12 ${
                                vetPasswordsMismatch ? "border-rose-400 focus:ring-rose-200" : "border-purple-100"
                              }`}
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setShowVetPassword((prev) => !prev)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                              {showVetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Confirmar contraseña</label>
                          <div className="relative">
                            <input
                              type={showVetConfirmPassword ? "text" : "password"}
                              value={vetForm.confirmPassword}
                              onChange={(e) =>
                                setVetForm({ ...vetForm, confirmPassword: e.target.value })
                              }
                              className={`w-full px-4 py-3 border-2 rounded-2xl bg-white/50 pr-12 ${
                                vetPasswordsMismatch ? "border-rose-400 focus:ring-rose-200" : "border-purple-100"
                              }`}
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setShowVetConfirmPassword((prev) => !prev)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                              {showVetConfirmPassword ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>
                        {vetPasswordsMismatch ? (
                          <p className="text-sm text-rose-600 md:col-span-2">
                            Las contraseñas no coinciden.
                          </p>
                        ) : null}
                        <div className="md:col-span-2 rounded-2xl border border-purple-100 bg-white/70 p-4">
                          <label className="flex items-start gap-3 text-sm text-gray-700">
                            <input
                              type="checkbox"
                              checked={vetForm.termsAccepted}
                              onChange={(e) =>
                                setVetForm({ ...vetForm, termsAccepted: e.target.checked })
                              }
                              className="mt-0.5 h-4 w-4 rounded border-purple-300 accent-purple-600"
                            />
                            <span>
                              Acepto los terminos y condiciones.{" "}
                              <button
                                type="button"
                                onClick={() => setShowTermsDialog(true)}
                                className="font-semibold text-purple-700 underline underline-offset-2 hover:text-purple-800"
                              >
                                Ver términos y condiciones
                              </button>
                            </span>
                          </label>
                        </div>
                      </div>
                    </section>
                  </div>
                ) : (
                  <div className="space-y-8">
                    <section>
                      <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-white" />
                        </div>
                        Datos iniciales de la clinica
                      </h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Clinica veterinaria</label>
                          <input
                            value={clinicForm.clinicName}
                            onChange={(e) => setClinicForm({ ...clinicForm, clinicName: e.target.value })}
                            className="w-full px-4 py-3 border-2 border-purple-100 rounded-2xl bg-white/50"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Telefono de contacto</label>
                          <input
                            type="tel"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            minLength={10}
                            maxLength={10}
                            value={clinicForm.phone}
                            onChange={(e) =>
                              setClinicForm({ ...clinicForm, phone: normalizePhone(e.target.value) })
                            }
                            className="w-full px-4 py-3 border-2 border-purple-100 rounded-2xl bg-white/50"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Ciudad de establecimiento</label>
                          <select
                            value={clinicForm.city}
                            onChange={(e) => setClinicForm({ ...clinicForm, city: e.target.value })}
                            className="w-full px-4 py-3 border-2 border-purple-100 rounded-2xl bg-white/50"
                            required
                          >
                            <option value="">Selecciona</option>
                            {cities.map((city) => (
                              <option key={city} value={city}>
                                {city}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Correo</label>
                          <input
                            type="email"
                            value={clinicForm.email}
                            onChange={(e) => setClinicForm({ ...clinicForm, email: e.target.value })}
                            className="w-full px-4 py-3 border-2 border-purple-100 rounded-2xl bg-white/50"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Contraseña</label>
                          <div className="relative">
                            <input
                              type={showClinicPassword ? "text" : "password"}
                              value={clinicForm.password}
                              onChange={(e) => setClinicForm({ ...clinicForm, password: e.target.value })}
                              className={`w-full px-4 py-3 border-2 rounded-2xl bg-white/50 pr-12 ${
                                clinicPasswordsMismatch ? "border-rose-400 focus:ring-rose-200" : "border-purple-100"
                              }`}
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setShowClinicPassword((prev) => !prev)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                              {showClinicPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Confirmar contraseña</label>
                          <div className="relative">
                            <input
                              type={showClinicConfirmPassword ? "text" : "password"}
                              value={clinicForm.confirmPassword}
                              onChange={(e) =>
                                setClinicForm({ ...clinicForm, confirmPassword: e.target.value })
                              }
                              className={`w-full px-4 py-3 border-2 rounded-2xl bg-white/50 pr-12 ${
                                clinicPasswordsMismatch ? "border-rose-400 focus:ring-rose-200" : "border-purple-100"
                              }`}
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setShowClinicConfirmPassword((prev) => !prev)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                              {showClinicConfirmPassword ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>
                        {clinicPasswordsMismatch ? (
                          <p className="text-sm text-rose-600 md:col-span-2">
                            Las contraseñas no coinciden.
                          </p>
                        ) : null}
                        <div className="md:col-span-2 rounded-2xl border border-purple-100 bg-white/70 p-4">
                          <label className="flex items-start gap-3 text-sm text-gray-700">
                            <input
                              type="checkbox"
                              checked={clinicForm.termsAccepted}
                              onChange={(e) =>
                                setClinicForm({ ...clinicForm, termsAccepted: e.target.checked })
                              }
                              className="mt-0.5 h-4 w-4 rounded border-purple-300 accent-purple-600"
                            />
                            <span>
                              Acepto los terminos y condiciones.{" "}
                              <button
                                type="button"
                                onClick={() => setShowTermsDialog(true)}
                                className="font-semibold text-purple-700 underline underline-offset-2 hover:text-purple-800"
                              >
                                Ver términos y condiciones
                              </button>
                            </span>
                          </label>
                        </div>
                      </div>
                    </section>
                  </div>
                )
              ) : (
                <div className="space-y-10">
                  {profileType === "vet" ? (
                    <>
                      {activePanelSection === "info" ? (
                        <>
                          <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-6">Foto de perfil</h2>
                            <div className="rounded-2xl border border-purple-100 bg-white/70 p-4">
                              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                <div className="h-20 w-20 rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50 to-fuchsia-50 flex items-center justify-center overflow-hidden">
                                  {vetForm.profilePhoto || vetForm.profilePhotoUrl ? (
                                    <PreviewAvatarImage
                                      file={vetForm.profilePhoto}
                                      url={vetForm.profilePhotoUrl}
                                      alt="Foto de perfil del veterinario"
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <User className="h-8 w-8 text-purple-500" />
                                  )}
                                </div>
                                <label
                                  htmlFor="vet-profile-photo-main"
                                  className="inline-flex cursor-pointer items-center justify-center rounded-2xl bg-gradient-to-r from-[#EC4899] to-[#4F46E5] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/30"
                                >
                                  Cambiar foto
                                </label>
                                <input
                                  id="vet-profile-photo-main"
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) =>
                                    setVetForm({ ...vetForm, profilePhoto: e.target.files?.[0] ?? null })
                                  }
                                />
                                {(vetForm.profilePhoto || vetForm.profilePhotoUrl) ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      queueDeleteUrl(vetForm.profilePhotoUrl);
                                      setVetForm({
                                        ...vetForm,
                                        profilePhoto: null,
                                        profilePhotoUrl: "",
                                      });
                                    }}
                                    className="inline-flex items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700"
                                  >
                                    Eliminar
                                  </button>
                                ) : null}
                              </div>
                              <p className="mt-2 text-xs text-gray-500">
                                JPG o PNG, maximo 5MB
                              </p>
                              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-semibold text-gray-700 mb-2">Nombres</label>
                                  <input
                                    value={vetForm.firstName}
                                    onChange={(e) => setVetForm({ ...vetForm, firstName: e.target.value })}
                                    className="w-full px-4 py-3 border-2 border-purple-100 rounded-2xl bg-white/50"
                                    required
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-semibold text-gray-700 mb-2">Apellidos</label>
                                  <input
                                    value={vetForm.lastName}
                                    onChange={(e) => setVetForm({ ...vetForm, lastName: e.target.value })}
                                    className="w-full px-4 py-3 border-2 border-purple-100 rounded-2xl bg-white/50"
                                    required
                                  />
                                </div>
                              </div>
                            </div>
                          </section>

                          <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-6">Ubicacion de servicios</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Ciudad de residencia</label>
                                <select
                                  value={vetForm.city}
                                  onChange={(e) => setVetForm({ ...vetForm, city: e.target.value })}
                                  className="w-full px-4 py-3 border-2 border-purple-100 rounded-2xl bg-white/50"
                                  required
                                >
                                  <option value="">Selecciona</option>
                                  {cities.map((city) => (
                                    <option key={city} value={city}>
                                      {city}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Direccion consultorio (opcional)</label>
                                <input
                                  value={vetForm.address}
                                  onChange={(e) => setVetForm({ ...vetForm, address: e.target.value })}
                                  className="w-full px-4 py-3 border-2 border-purple-100 rounded-2xl bg-white/50"
                                />
                              </div>
                              <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Zonas de atencion domiciliaria (opcional)</label>
                                <div className="grid grid-cols-2 gap-3 rounded-2xl border-2 border-purple-100 bg-white/50 p-3 sm:grid-cols-3 md:grid-cols-5">
                                  {homeServiceAreaOptions.map((option) => {
                                    const isSelected = vetForm.homeServiceAreas.includes(option.value);
                                    return (
                                      <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => toggleHomeServiceArea(option.value)}
                                        className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                                          isSelected
                                            ? "border-purple-500 bg-purple-100 text-purple-700"
                                            : "border-purple-200 bg-white text-gray-700 hover:border-purple-300"
                                        }`}
                                      >
                                        {option.label}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          </section>

                          <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-6">Informacion profesional</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Sobre mi</label>
                                <textarea
                                  rows={4}
                                  value={vetForm.about}
                                  onChange={(e) => setVetForm({ ...vetForm, about: e.target.value })}
                                  maxLength={ABOUT_MAX_CHARS}
                                  className={`w-full px-4 py-3 border-2 rounded-2xl bg-white/50 ${
                                    vetAboutTooLong ? "border-rose-400 focus:ring-rose-200" : "border-purple-100"
                                  }`}
                                />
                                <p className="mt-1 text-xs text-gray-500">
                                  {vetForm.about.length}/{ABOUT_MAX_CHARS}
                                </p>
                                {vetAboutTooLong ? (
                                  <p className="mt-1 text-xs text-rose-600">
                                    Maximo {ABOUT_MAX_CHARS} caracteres.
                                  </p>
                                ) : null}
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Numero tarjeta profesional</label>
                                <input
                                  value={vetForm.professionalCardNumber}
                                  onChange={(e) =>
                                    setVetForm({ ...vetForm, professionalCardNumber: e.target.value })
                                  }
                                  className="w-full px-4 py-3 border-2 border-purple-100 rounded-2xl bg-white/50"
                                  required
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Costo de la consulta</label>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  pattern="[0-9.]*"
                                  placeholder="Ej: 45.000"
                                  value={vetForm.consultationCost}
                                  onChange={(e) => handleVetConsultationCostChange(e.target.value)}
                                  className="w-full px-4 py-3 border-2 border-purple-100 rounded-2xl bg-white/50"
                                  required
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Años de experiencia</label>
                                <input
                                  value={vetForm.experience}
                                  onChange={(e) => setVetForm({ ...vetForm, experience: e.target.value })}
                                  className="w-full px-4 py-3 border-2 border-purple-100 rounded-2xl bg-white/50"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Universidad Pregrado</label>
                                <input
                                  value={vetForm.university}
                                  onChange={(e) => setVetForm({ ...vetForm, university: e.target.value })}
                                  className="w-full px-4 py-3 border-2 border-purple-100 rounded-2xl bg-white/50"
                                  required
                                />
                              </div>
                            </div>
                              <div className="mt-8 space-y-3">
                                <div className="flex items-center justify-between">
                                  <label className="block text-sm font-semibold text-gray-700">
                                    Otras Universidades (Posgrados, Diplomados & Cursos)
                                  </label>
                                  <button
                                    type="button"
                                    onClick={addOtherUniversity}
                                    className="text-sm font-semibold text-purple-600 hover:text-purple-700"
                                  >
                                    + Agregar
                                  </button>
                                </div>
                                <div className="space-y-3">
                                  {vetForm.otherUniversities.map((item, index) => (
                                    <div
                                      key={`other-university-${index}`}
                                      className="grid grid-cols-1 md:grid-cols-[220px_1fr_auto] gap-2 items-center"
                                    >
                                      <select
                                        value={item.degreeType}
                                        onChange={(e) =>
                                          updateOtherUniversity(index, "degreeType", e.target.value)
                                        }
                                        className="w-full px-4 py-3 border-2 border-purple-100 rounded-2xl bg-white/50"
                                      >
                                        {otherUniversityDegreeOptions.map((option) => (
                                          <option key={option} value={option}>
                                            {option}
                                          </option>
                                        ))}
                                      </select>
                                      <input
                                        value={item.title}
                                        onChange={(e) =>
                                          updateOtherUniversity(index, "title", e.target.value)
                                        }
                                        placeholder="Nombre del titulo"
                                        className="w-full px-4 py-3 border-2 border-purple-100 rounded-2xl bg-white/50"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => removeOtherUniversity(index)}
                                        className="text-xs text-rose-500 hover:text-rose-600"
                                      >
                                        Quitar
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div className="mt-8">
                                <label className="block text-sm font-semibold text-gray-700 mb-3">Enfasis medico</label>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                  {vetSpecialties.map((specialty) => (
                                    <label
                                      key={specialty}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium cursor-pointer transition ${
                                      vetForm.specialties.includes(specialty)
                                        ? "bg-purple-600 text-white"
                                        : "bg-white/70 text-gray-700"
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={vetForm.specialties.includes(specialty)}
                                      onChange={() => toggleVetSpecialty(specialty)}
                                      className="hidden"
                                    />
                                    {specialty}
                                    </label>
                                  ))}
                                </div>
                                {vetForm.specialties.includes(OTHER_SPECIALTY_LABEL) ? (
                                  <div className="mt-4">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                      Especifica el enfasis medico
                                    </label>
                                    <input
                                      value={vetForm.otherSpecialtyName}
                                      onChange={(e) =>
                                        setVetForm({ ...vetForm, otherSpecialtyName: e.target.value })
                                      }
                                      className="w-full px-4 py-3 border-2 border-purple-100 rounded-2xl bg-white/50"
                                      placeholder="Ej: Medicina deportiva"
                                    />
                                  </div>
                                ) : null}
                              </div>
                            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Idiomas</label>
                                <input
                                  value={vetForm.languages}
                                  onChange={(e) => setVetForm({ ...vetForm, languages: e.target.value })}
                                  className="w-full px-4 py-3 border-2 border-purple-100 rounded-2xl bg-white/50"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Premios</label>
                                <input
                                  value={vetForm.awards}
                                  onChange={(e) => setVetForm({ ...vetForm, awards: e.target.value })}
                                  className="w-full px-4 py-3 border-2 border-purple-100 rounded-2xl bg-white/50"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Links de Publicaciones</label>
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-500">Links de publicaciones</span>
                                    <button
                                      type="button"
                                      onClick={addPublicationLink}
                                      className="text-sm font-semibold text-purple-600 hover:text-purple-700"
                                    >
                                      + Agregar
                                    </button>
                                  </div>
                                  <div className="space-y-3">
                                    {vetForm.publicationLinks.map((item, index) => (
                                      <div
                                        key={`publication-link-${index}`}
                                        className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2 items-center"
                                      >
                                        <input
                                          value={item.title}
                                          onChange={(e) => updatePublicationLink(index, "title", e.target.value)}
                                          placeholder="Nombre de la publicación"
                                          className="w-full px-4 py-3 border-2 border-purple-100 rounded-2xl bg-white/50"
                                        />
                                        <input
                                          value={item.url}
                                          onChange={(e) => updatePublicationLink(index, "url", e.target.value)}
                                          placeholder="https://..."
                                          className="w-full px-4 py-3 border-2 border-purple-100 rounded-2xl bg-white/50"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => removePublicationLink(index)}
                                          className="text-xs text-rose-500 hover:text-rose-600"
                                        >
                                          Quitar
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                              <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Redes sociales</label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {[
                                    { key: "instagram", label: "Instagram", icon: Instagram },
                                    { key: "facebook", label: "Facebook", icon: Facebook },
                                    { key: "twitter", label: "Twitter", icon: Twitter },
                                    { key: "linkedin", label: "LinkedIn", icon: Linkedin },
                                  ].map((network) => (
                                    <div key={network.key} className="flex items-center gap-3">
                                      <div className="h-10 w-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                                        <network.icon className="w-5 h-5" />
                                      </div>
                                      <input
                                        value={(vetForm.socialLinks as Record<string, string>)[network.key] ?? ""}
                                        onChange={(e) =>
                                          setVetForm((prev) => ({
                                            ...prev,
                                            socialLinks: {
                                              ...prev.socialLinks,
                                              [network.key]: e.target.value,
                                            },
                                          }))
                                        }
                                        placeholder={`URL de ${network.label}`}
                                        className="w-full px-4 py-3 border-2 border-purple-100 rounded-2xl bg-white/50"
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </section>

                          <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-6">Horarios de atencion</h2>
                            <SchedulePicker
                              value={vetForm.schedule}
                              onChange={(next) => setVetForm({ ...vetForm, schedule: next })}
                            />
                          </section>

                          <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-6">Documentos</h2>
                            <div className="space-y-6">
                              <label
                                htmlFor="vet-professional-card"
                                className="flex items-center gap-3 border-2 border-dashed border-purple-200 rounded-2xl px-4 py-4 bg-gradient-to-br from-purple-50/80 via-white/70 to-purple-100/80 cursor-pointer hover:border-purple-300"
                              >
                                <Upload className="w-5 h-5 text-purple-500" />
                                <span className="text-sm font-semibold text-gray-700">
                                  {vetForm.professionalCardFile
                                    ? `Tarjeta profesional: ${vetForm.professionalCardFile.name}`
                                    : "Subir tarjeta profesional"}
                                </span>
                              </label>
                              <input
                                id="vet-professional-card"
                                type="file"
                                className="hidden"
                                onChange={(e) =>
                                  setVetForm({ ...vetForm, professionalCardFile: e.target.files?.[0] ?? null })
                                }
                              />
                              <FilePreview
                                file={vetForm.professionalCardFile}
                                url={vetForm.professionalCardUrl}
                                label="Tarjeta profesional"
                              />
                              {(vetForm.professionalCardFile || vetForm.professionalCardUrl) ? (
                                <div className="flex items-center gap-2">
                                  <label
                                    htmlFor="vet-professional-card"
                                    className="inline-flex items-center rounded-xl bg-purple-600 px-3 py-2 text-xs font-semibold text-white"
                                  >
                                    Cambiar
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      queueDeleteUrl(vetForm.professionalCardUrl);
                                      setVetForm({
                                        ...vetForm,
                                        professionalCardFile: null,
                                        professionalCardUrl: "",
                                      });
                                    }}
                                    className="inline-flex items-center rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700"
                                  >
                                    Eliminar
                                  </button>
                                </div>
                              ) : null}
                              {vetForm.specialties.length > 0 ? (
                                <div className="space-y-4">
                                  <p className="text-sm font-semibold text-gray-700">Certificados</p>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {vetForm.specialties.map((specialty) => {
                                      const resolved = resolveVetSpecialtyLabel(specialty);
                                      const isOptional = isCertificateOptionalForSpecialty(resolved);
                                      return (
                                        <div key={specialty}>
                                          <label className="flex items-center justify-between gap-3 border-2 border-dashed border-purple-200 rounded-2xl px-4 py-3 bg-gradient-to-br from-purple-50/80 via-white/70 to-purple-100/80 cursor-pointer hover:border-purple-300">
                                            <span className="text-sm font-semibold text-gray-700">{specialty}</span>
                                            <span className="text-xs text-purple-600">
                                              {vetForm.specialtyFiles[specialty]?.name ??
                                                (isOptional ? "Opcional" : "Subir archivo")}
                                            </span>
                                            <input
                                              type="file"
                                              className="hidden"
                                              onChange={(e) =>
                                                setVetForm((prev) => ({
                                                  ...prev,
                                                  specialtyFiles: {
                                                    ...prev.specialtyFiles,
                                                    [specialty]: e.target.files?.[0] ?? null,
                                                  },
                                                }))
                                              }
                                            />
                                          </label>
                                          <FilePreview
                                            file={vetForm.specialtyFiles[specialty] ?? null}
                                            label={`Titulo de ${specialty}${isOptional ? " (opcional)" : ""}`}
                                          />
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          </section>

                          <section>
                            <CarouselPhotosEditor
                              newFiles={vetForm.professionalPhotos}
                              savedUrls={vetForm.professionalPhotoUrls}
                              onAdd={addProfessionalPhoto}
                              onRemoveNew={removeProfessionalPhoto}
                              onRemoveSaved={removeSavedProfessionalPhoto}
                            />
                          </section>
                        </>
                      ) : null}

                      {activePanelSection === "hours" ? (
                        <section>
                          <h2 className="text-2xl font-bold text-gray-900 mb-6">Horarios de atencion</h2>
                          <SchedulePicker
                            value={vetForm.schedule}
                            onChange={(next) => setVetForm({ ...vetForm, schedule: next })}
                          />
                        </section>
                      ) : null}

                      {activePanelSection === "documents" ? (
                        <section>
                          <h2 className="text-2xl font-bold text-gray-900 mb-6">Documentos</h2>
                          <div className="space-y-6">
                            <label
                              htmlFor="vet-professional-card-docs"
                              className="flex items-center gap-3 border-2 border-dashed border-purple-200 rounded-2xl px-4 py-4 bg-gradient-to-br from-purple-50/80 via-white/70 to-purple-100/80 cursor-pointer hover:border-purple-300"
                            >
                              <Upload className="w-5 h-5 text-purple-500" />
                              <span className="text-sm font-semibold text-gray-700">
                                {vetForm.professionalCardFile
                                  ? `Tarjeta profesional: ${vetForm.professionalCardFile.name}`
                                  : "Subir tarjeta profesional"}
                              </span>
                            </label>
                            <input
                              id="vet-professional-card-docs"
                              type="file"
                              className="hidden"
                              onChange={(e) =>
                                setVetForm({ ...vetForm, professionalCardFile: e.target.files?.[0] ?? null })
                              }
                            />
                            <FilePreview
                              file={vetForm.professionalCardFile}
                              url={vetForm.professionalCardUrl}
                              label="Tarjeta profesional"
                            />
                            {(vetForm.professionalCardFile || vetForm.professionalCardUrl) ? (
                              <div className="flex items-center gap-2">
                                <label
                                  htmlFor="vet-professional-card-docs"
                                  className="inline-flex items-center rounded-xl bg-purple-600 px-3 py-2 text-xs font-semibold text-white"
                                >
                                  Cambiar
                                </label>
                                <button
                                  type="button"
                                  onClick={() => {
                                    queueDeleteUrl(vetForm.professionalCardUrl);
                                    setVetForm({
                                      ...vetForm,
                                      professionalCardFile: null,
                                      professionalCardUrl: "",
                                    });
                                  }}
                                  className="inline-flex items-center rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700"
                                >
                                  Eliminar
                                </button>
                              </div>
                            ) : null}
                            {vetForm.specialties.length > 0 ? (
                              <div className="space-y-4">
                                <p className="text-sm font-semibold text-gray-700">Certificados</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {vetForm.specialties.map((specialty) => {
                                      const resolved = resolveVetSpecialtyLabel(specialty);
                                      const isOptional = isCertificateOptionalForSpecialty(resolved);
                                      return (
                                      <div key={specialty}>
                                        <label
                                          htmlFor={buildInputId("vet-specialty", specialty)}
                                          className="flex items-center justify-between gap-3 border-2 border-dashed border-purple-200 rounded-2xl px-4 py-3 bg-gradient-to-br from-purple-50/80 via-white/70 to-purple-100/80 cursor-pointer hover:border-purple-300"
                                        >
                                          <span className="text-sm font-semibold text-gray-700">{specialty}</span>
                                          <span className="text-xs text-purple-600">
                                            {vetForm.specialtyFiles[specialty]?.name ??
                                              (isOptional ? "Opcional" : "Subir archivo")}
                                          </span>
                                        </label>
                                        <input
                                          id={buildInputId("vet-specialty", specialty)}
                                          type="file"
                                          className="hidden"
                                          onChange={(e) =>
                                            setVetForm((prev) => ({
                                              ...prev,
                                              specialtyFiles: {
                                                ...prev.specialtyFiles,
                                                [specialty]: e.target.files?.[0] ?? null,
                                              },
                                            }))
                                          }
                                        />
                                        <FilePreview
                                          file={vetForm.specialtyFiles[specialty] ?? null}
                                          url={
                                            vetForm.specialtyDocumentUrls[
                                              resolveVetSpecialtyLabel(specialty)
                                            ]
                                          }
                                          label={`Titulo de ${resolveVetSpecialtyLabel(specialty)}${isOptional ? " (opcional)" : ""}`}
                                        />
                                        {(vetForm.specialtyFiles[specialty] ||
                                          vetForm.specialtyDocumentUrls[
                                            resolveVetSpecialtyLabel(specialty)
                                          ]) ? (
                                          <div className="mt-2 flex items-center gap-2">
                                            <label
                                              htmlFor={buildInputId("vet-specialty", specialty)}
                                              className="inline-flex items-center rounded-xl bg-purple-600 px-3 py-2 text-xs font-semibold text-white"
                                            >
                                              Cambiar
                                            </label>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const resolved = resolveVetSpecialtyLabel(specialty);
                                                queueDeleteUrl(vetForm.specialtyDocumentUrls[resolved]);
                                                setVetForm((prev) => ({
                                                  ...prev,
                                                  specialtyFiles: {
                                                    ...prev.specialtyFiles,
                                                    [specialty]: null,
                                                  },
                                                  specialtyDocumentUrls: Object.fromEntries(
                                                    Object.entries(prev.specialtyDocumentUrls).filter(
                                                      ([key]) => key !== resolved,
                                                    ),
                                                  ),
                                                }));
                                              }}
                                              className="inline-flex items-center rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700"
                                            >
                                              Eliminar
                                            </button>
                                          </div>
                                        ) : null}
                                      </div>
                                      );
                                    })}
                                  </div>
                              </div>
                            ) : null}
                          </div>
                        </section>
                      ) : null}

                      {activePanelSection === "carousel" ? (
                        <section className="space-y-6">
                          <h2 className="text-2xl font-bold text-gray-900">Carrusel de fotos</h2>
                          <CarouselPhotosEditor
                            newFiles={vetForm.professionalPhotos}
                            savedUrls={vetForm.professionalPhotoUrls}
                            onAdd={addProfessionalPhoto}
                            onRemoveNew={removeProfessionalPhoto}
                            onRemoveSaved={removeSavedProfessionalPhoto}
                          />
                        </section>
                      ) : null}

                      {activePanelSection === "preview" ? (
                        <section className="space-y-8">
                          <h2 className="text-2xl font-bold text-gray-900">Vista previa</h2>
                          <div className="space-y-4">
                            <p className="text-sm text-gray-600">
                              Así se verá en el directorio y en el perfil completo.
                            </p>
                            <h3 className="text-sm font-semibold uppercase tracking-widest text-purple-600/80">
                              Tarjeta en directorio
                            </h3>
                            <div className="max-w-md">
                              <DirectoryProfileCardPreview profile={vetPreviewData} />
                            </div>
                          </div>

                          <div className="space-y-4">
                            <h3 className="text-sm font-semibold uppercase tracking-widest text-purple-600/80">
                              Perfil completo
                            </h3>
                            <FullProfilePreview profile={vetPreviewData} />
                          </div>

                          {currentUserId ? (
                            <button
                              type="button"
                              onClick={() => router.push(`/veterinario/${currentUserId}`)}
                              className="rounded-2xl bg-gradient-to-r from-[#EC4899] to-[#4F46E5] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/30"
                            >
                              Ver pagina publica actual
                            </button>
                          ) : null}
                          {!currentUserId ? (
                            <p className="text-xs text-gray-500">
                              El enlace público estará disponible cuando tu perfil exista en la base de datos.
                            </p>
                          ) : null}
                        </section>
                      ) : null}

                      {activePanelSection === "settings" ? (
                        <section className="space-y-6">
                          <h2 className="text-2xl font-bold text-gray-900">Configuración</h2>

                          <div className="rounded-3xl border border-purple-100 bg-white/70 p-6">
                            <h3 className="text-lg font-bold text-gray-900">Cambiar correo electrónico</h3>
                            <p className="mt-1 text-sm text-gray-600">
                              Correo actual:{" "}
                              <span className="font-semibold text-gray-800">
                                {accountCurrentEmail || "No disponible"}
                              </span>
                            </p>
                            <p className="mt-1 text-sm text-gray-600">
                              Ingresa el nuevo correo para enviarte un magic link de confirmación.
                            </p>
                            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                              <input
                                type="email"
                                value={accountNextEmail}
                                onChange={(e) => setAccountNextEmail(e.target.value)}
                                placeholder="Nuevo correo electrónico"
                                className="w-full px-4 py-3 border-2 border-purple-100 rounded-2xl bg-white/80"
                              />
                              <button
                                type="button"
                                onClick={handleUpdateAccountEmail}
                                disabled={accountSettingsLoading}
                                className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-[#EC4899] to-[#4F46E5] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/30 disabled:opacity-60"
                              >
                                {accountSettingsLoading ? "Enviando enlace..." : "Enviar magic link"}
                              </button>
                            </div>
                          </div>

                          <div className="rounded-3xl border border-purple-100 bg-white/70 p-6">
                            <h3 className="text-lg font-bold text-gray-900">Cambiar contraseña</h3>
                            <p className="mt-1 text-sm text-gray-600">
                              Te enviaremos un enlace al correo de tu cuenta para que cambies la contraseña de forma segura.
                            </p>
                            <div className="mt-4">
                              <button
                                type="button"
                                onClick={handleUpdateAccountPassword}
                                disabled={accountSettingsLoading}
                                className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-[#EC4899] to-[#4F46E5] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/30 disabled:opacity-60"
                              >
                                {accountSettingsLoading ? "Enviando enlace..." : "Enviar enlace para cambiar contraseña"}
                              </button>
                            </div>
                          </div>
                        </section>
                      ) : null}
                    </>
                  ) : (
                    <>
                      {activePanelSection === "info" ? (
                        <>
                          <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-6">Logo de la clinica</h2>
                            <div className="rounded-2xl border border-purple-100 bg-white/70 p-4">
                              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                <div className="h-20 w-20 rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50 to-fuchsia-50 flex items-center justify-center overflow-hidden">
                                  <LogoPreview file={clinicForm.logoFile} url={clinicForm.logoUrl} />
                                </div>
                                <label
                                  htmlFor="clinic-logo"
                                  className="inline-flex cursor-pointer items-center justify-center rounded-2xl bg-gradient-to-r from-[#EC4899] to-[#4F46E5] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/30"
                                >
                                  Cambiar logo
                                </label>
                                <input
                                  id="clinic-logo"
                                  type="file"
                                  accept="image/png"
                                  className="hidden"
                                  onChange={(e) =>
                                    setClinicForm({
                                      ...clinicForm,
                                      logoFile: e.target.files?.[0] ?? null,
                                    })
                                  }
                                />
                                {(clinicForm.logoFile || clinicForm.logoUrl) ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      queueDeleteUrl(clinicForm.logoUrl);
                                      setClinicForm({
                                        ...clinicForm,
                                        logoFile: null,
                                        logoUrl: "",
                                      });
                                    }}
                                    className="inline-flex items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700"
                                  >
                                    Eliminar
                                  </button>
                                ) : null}
                              </div>
                              <p className="mt-2 text-xs text-gray-500">
                                PNG con fondo transparente, maximo 5MB
                              </p>
                            </div>
                          </section>

                          <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-6">Datos de la clinica</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre clinica veterinaria</label>
                                <input
                                  value={clinicForm.clinicName}
                                  onChange={(e) => setClinicForm({ ...clinicForm, clinicName: e.target.value })}
                                  className="w-full px-4 py-3 border-2 border-purple-100 rounded-2xl bg-white/50"
                                  required
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Numero de profesionales</label>
                                <input
                                  value={clinicForm.professionalsCount}
                                  onChange={(e) => setClinicForm({ ...clinicForm, professionalsCount: e.target.value })}
                                  className="w-full px-4 py-3 border-2 border-purple-100 rounded-2xl bg-white/50"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Ciudad de establecimiento</label>
                                <select
                                  value={clinicForm.city}
                                  onChange={(e) => setClinicForm({ ...clinicForm, city: e.target.value })}
                                  className="w-full px-4 py-3 border-2 border-purple-100 rounded-2xl bg-white/50"
                                  required
                                >
                                  <option value="">Selecciona</option>
                                  {cities.map((city) => (
                                    <option key={city} value={city}>
                                      {city}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="md:col-span-2 space-y-3">
                                <div className="flex items-center justify-between">
                                  <label className="block text-sm font-semibold text-gray-700">Direccion sede</label>
                                  <button
                                    type="button"
                                    onClick={addClinicAddress}
                                    className="text-sm font-semibold text-purple-600 hover:text-purple-700"
                                  >
                                    + Agregar sede
                                  </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {clinicForm.addresses.map((value, index) => (
                                    <div key={`clinic-address-${index}`} className="flex items-center gap-2">
                                      <input
                                        value={value}
                                        onChange={(e) => updateClinicAddress(index, e.target.value)}
                                        className="w-full px-4 py-3 border-2 border-purple-100 rounded-2xl bg-white/50"
                                        required
                                      />
                                      {clinicForm.addresses.length > 1 ? (
                                        <button
                                          type="button"
                                          onClick={() => removeClinicAddress(index)}
                                          className="text-xs text-rose-500 hover:text-rose-600"
                                        >
                                          Quitar
                                        </button>
                                      ) : null}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </section>

                          <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-6">Representante</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Nombres</label>
                                <input
                                  value={clinicForm.firstName}
                                  onChange={(e) => setClinicForm({ ...clinicForm, firstName: e.target.value })}
                                  className="w-full px-4 py-3 border-2 border-purple-100 rounded-2xl bg-white/50"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Apellidos</label>
                                <input
                                  value={clinicForm.lastName}
                                  onChange={(e) => setClinicForm({ ...clinicForm, lastName: e.target.value })}
                                  className="w-full px-4 py-3 border-2 border-purple-100 rounded-2xl bg-white/50"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Sexo</label>
                                <select
                                  value={clinicForm.sex}
                                  onChange={(e) => setClinicForm({ ...clinicForm, sex: e.target.value })}
                                  className="w-full px-4 py-3 border-2 border-purple-100 rounded-2xl bg-white/50"
                                >
                                  <option value="">Selecciona</option>
                                  {sexOptions.map((option) => (
                                    <option key={option} value={option}>
                                      {option}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Telefono de contacto</label>
                                <input
                                  type="tel"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  minLength={10}
                                  maxLength={10}
                                  value={clinicForm.phone}
                                  onChange={(e) =>
                                    setClinicForm({
                                      ...clinicForm,
                                      phone: normalizePhone(e.target.value),
                                    })
                                  }
                                  className="w-full px-4 py-3 border-2 border-purple-100 rounded-2xl bg-white/50"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Cargo</label>
                                <select
                                  value={clinicForm.role}
                                  onChange={(e) => setClinicForm({ ...clinicForm, role: e.target.value })}
                                  className="w-full px-4 py-3 border-2 border-purple-100 rounded-2xl bg-white/50"
                                >
                                  <option value="">Selecciona</option>
                                  {clinicRoles.map((role) => (
                                    <option key={role} value={role}>
                                      {role}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </section>

                          <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-6">Servicios y operacion</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Sobre nosotros</label>
                                <textarea
                                  rows={4}
                                  value={clinicForm.about}
                                  onChange={(e) => setClinicForm({ ...clinicForm, about: e.target.value })}
                                  maxLength={ABOUT_MAX_CHARS}
                                  className={`w-full px-4 py-3 border-2 rounded-2xl bg-white/50 ${
                                    clinicAboutTooLong ? "border-rose-400 focus:ring-rose-200" : "border-purple-100"
                                  }`}
                                />
                                <p className="mt-1 text-xs text-gray-500">
                                  {clinicForm.about.length}/{ABOUT_MAX_CHARS}
                                </p>
                                {clinicAboutTooLong ? (
                                  <p className="mt-1 text-xs text-rose-600">
                                    Maximo {ABOUT_MAX_CHARS} caracteres.
                                  </p>
                                ) : null}
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Costo consulta</label>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  pattern="[0-9.]*"
                                  placeholder="Ej: 45.000"
                                  value={clinicForm.consultationCost}
                                  onChange={(e) => handleClinicConsultationCostChange(e.target.value)}
                                  className="w-full px-4 py-3 border-2 border-purple-100 rounded-2xl bg-white/50"
                                  required
                                />
                              </div>
                              <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Redes sociales</label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {[
                                    { key: "instagram", label: "Instagram", icon: Instagram },
                                    { key: "facebook", label: "Facebook", icon: Facebook },
                                    { key: "twitter", label: "Twitter", icon: Twitter },
                                    { key: "linkedin", label: "LinkedIn", icon: Linkedin },
                                  ].map((network) => (
                                    <div key={`clinic-${network.key}`} className="flex items-center gap-3">
                                      <div className="h-10 w-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                                        <network.icon className="w-5 h-5" />
                                      </div>
                                      <input
                                        value={(clinicForm.socialLinks as Record<string, string>)[network.key] ?? ""}
                                        onChange={(e) =>
                                          setClinicForm((prev) => ({
                                            ...prev,
                                            socialLinks: {
                                              ...prev.socialLinks,
                                              [network.key]: e.target.value,
                                            },
                                          }))
                                        }
                                        placeholder={`URL de ${network.label}`}
                                        className="w-full px-4 py-3 border-2 border-purple-100 rounded-2xl bg-white/50"
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                            <div className="mt-8">
                              <label className="block text-sm font-semibold text-gray-700 mb-3">Enfasis Medico</label>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {clinicServices.map((service) => (
                                  <label
                                    key={service}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium cursor-pointer transition ${
                                      clinicForm.services.includes(service)
                                        ? "bg-purple-600 text-white"
                                        : "bg-white/70 text-gray-700"
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={clinicForm.services.includes(service)}
                                      onChange={() => toggleClinicService(service)}
                                      className="hidden"
                                    />
                                    {service}
                                  </label>
                                ))}
                              </div>
                              {clinicForm.services.includes(OTHER_SPECIALTY_LABEL) ? (
                                <div className="mt-4">
                                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Especifica el enfasis medico
                                  </label>
                                  <input
                                    value={clinicForm.otherService}
                                    onChange={(e) =>
                                      setClinicForm({ ...clinicForm, otherService: e.target.value })
                                    }
                                    className="w-full px-4 py-3 border-2 border-purple-100 rounded-2xl bg-white/50"
                                    placeholder="Ej: Medicina deportiva"
                                  />
                                </div>
                              ) : null}
                            </div>
                          </section>

                          <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-6">Horarios de atencion</h2>
                            <SchedulePicker
                              value={clinicForm.schedule}
                              onChange={(next) => setClinicForm({ ...clinicForm, schedule: next })}
                            />
                          </section>

                          <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-6">Documentos y licencias</h2>
                            <div className="space-y-6">
                              <label
                                htmlFor="clinic-rut"
                                className="flex items-center gap-3 border-2 border-dashed border-purple-200 rounded-2xl px-4 py-4 bg-gradient-to-br from-purple-50/80 via-white/70 to-purple-100/80 cursor-pointer hover:border-purple-300"
                              >
                                <Upload className="w-5 h-5 text-purple-500" />
                                <span className="text-sm font-semibold text-gray-700">
                                  {clinicForm.rutFile ? `Foto del RUT: ${clinicForm.rutFile.name}` : "Foto del RUT"}
                                </span>
                              </label>
                              <input
                                id="clinic-rut"
                                type="file"
                                className="hidden"
                                onChange={(e) => setClinicForm({ ...clinicForm, rutFile: e.target.files?.[0] ?? null })}
                              />
                              <FilePreview file={clinicForm.rutFile} url={clinicForm.rutUrl} label="RUT" />
                              {(clinicForm.rutFile || clinicForm.rutUrl) ? (
                                <div className="flex items-center gap-2">
                                  <label
                                    htmlFor="clinic-rut"
                                    className="inline-flex items-center rounded-xl bg-purple-600 px-3 py-2 text-xs font-semibold text-white"
                                  >
                                    Cambiar
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      queueDeleteUrl(clinicForm.rutUrl);
                                      setClinicForm({
                                        ...clinicForm,
                                        rutFile: null,
                                        rutUrl: "",
                                      });
                                    }}
                                    className="inline-flex items-center rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700"
                                  >
                                    Eliminar
                                  </button>
                                </div>
                              ) : null}

                              <label
                                htmlFor="clinic-mercantile"
                                className="flex items-center gap-3 border-2 border-dashed border-purple-200 rounded-2xl px-4 py-4 bg-gradient-to-br from-purple-50/80 via-white/70 to-purple-100/80 cursor-pointer hover:border-purple-300"
                              >
                                <Upload className="w-5 h-5 text-purple-500" />
                                <span className="text-sm font-semibold text-gray-700">
                                  {clinicForm.mercantileRegistryFile
                                    ? `Registro mercantil: ${clinicForm.mercantileRegistryFile.name}`
                                    : "Registro mercantil"}
                                </span>
                              </label>
                              <input
                                id="clinic-mercantile"
                                type="file"
                                className="hidden"
                                onChange={(e) =>
                                  setClinicForm({ ...clinicForm, mercantileRegistryFile: e.target.files?.[0] ?? null })
                                }
                              />
                              <FilePreview
                                file={clinicForm.mercantileRegistryFile}
                                url={clinicForm.mercantileRegistryUrl}
                                label="Registro mercantil"
                              />
                              {(clinicForm.mercantileRegistryFile || clinicForm.mercantileRegistryUrl) ? (
                                <div className="flex items-center gap-2">
                                  <label
                                    htmlFor="clinic-mercantile"
                                    className="inline-flex items-center rounded-xl bg-purple-600 px-3 py-2 text-xs font-semibold text-white"
                                  >
                                    Cambiar
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      queueDeleteUrl(clinicForm.mercantileRegistryUrl);
                                      setClinicForm({
                                        ...clinicForm,
                                        mercantileRegistryFile: null,
                                        mercantileRegistryUrl: "",
                                      });
                                    }}
                                    className="inline-flex items-center rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700"
                                  >
                                    Eliminar
                                  </button>
                                </div>
                              ) : null}

                              <label
                                htmlFor="clinic-ica"
                                className="flex items-center gap-3 border-2 border-dashed border-purple-200 rounded-2xl px-4 py-4 bg-gradient-to-br from-purple-50/80 via-white/70 to-purple-100/80 cursor-pointer hover:border-purple-300"
                              >
                                <Upload className="w-5 h-5 text-purple-500" />
                                <span className="text-sm font-semibold text-gray-700">
                                  {clinicForm.icaRegistryFile
                                    ? `Registro ICA: ${clinicForm.icaRegistryFile.name}`
                                    : "Registro ICA"}
                                </span>
                              </label>
                              <input
                                id="clinic-ica"
                                type="file"
                                className="hidden"
                                onChange={(e) =>
                                  setClinicForm({ ...clinicForm, icaRegistryFile: e.target.files?.[0] ?? null })
                                }
                              />
                              <FilePreview
                                file={clinicForm.icaRegistryFile}
                                url={clinicForm.icaRegistryUrl}
                                label="Registro ICA"
                              />
                              {(clinicForm.icaRegistryFile || clinicForm.icaRegistryUrl) ? (
                                <div className="flex items-center gap-2">
                                  <label
                                    htmlFor="clinic-ica"
                                    className="inline-flex items-center rounded-xl bg-purple-600 px-3 py-2 text-xs font-semibold text-white"
                                  >
                                    Cambiar
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      queueDeleteUrl(clinicForm.icaRegistryUrl);
                                      setClinicForm({
                                        ...clinicForm,
                                        icaRegistryFile: null,
                                        icaRegistryUrl: "",
                                      });
                                    }}
                                    className="inline-flex items-center rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700"
                                  >
                                    Eliminar
                                  </button>
                                </div>
                              ) : null}

                              <label
                                htmlFor="clinic-prof-card"
                                className="flex items-center gap-3 border-2 border-dashed border-purple-200 rounded-2xl px-4 py-4 bg-gradient-to-br from-purple-50/80 via-white/70 to-purple-100/80 cursor-pointer hover:border-purple-300"
                              >
                                <Upload className="w-5 h-5 text-purple-500" />
                                <span className="text-sm font-semibold text-gray-700">
                                  {clinicForm.professionalCardFile
                                    ? `Tarjeta profesional: ${clinicForm.professionalCardFile.name}`
                                    : "Tarjeta profesional"}
                                </span>
                              </label>
                              <input
                                id="clinic-prof-card"
                                type="file"
                                className="hidden"
                                onChange={(e) =>
                                  setClinicForm({ ...clinicForm, professionalCardFile: e.target.files?.[0] ?? null })
                                }
                              />
                              <FilePreview
                                file={clinicForm.professionalCardFile}
                                url={clinicForm.professionalCardUrl}
                                label="Tarjeta profesional"
                              />
                              {(clinicForm.professionalCardFile || clinicForm.professionalCardUrl) ? (
                                <div className="flex items-center gap-2">
                                  <label
                                    htmlFor="clinic-prof-card"
                                    className="inline-flex items-center rounded-xl bg-purple-600 px-3 py-2 text-xs font-semibold text-white"
                                  >
                                    Cambiar
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      queueDeleteUrl(clinicForm.professionalCardUrl);
                                      setClinicForm({
                                        ...clinicForm,
                                        professionalCardFile: null,
                                        professionalCardUrl: "",
                                      });
                                    }}
                                    className="inline-flex items-center rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700"
                                  >
                                    Eliminar
                                  </button>
                                </div>
                              ) : null}

                              <label
                                htmlFor="clinic-diploma"
                                className="flex items-center gap-3 border-2 border-dashed border-purple-200 rounded-2xl px-4 py-4 bg-gradient-to-br from-purple-50/80 via-white/70 to-purple-100/80 cursor-pointer hover:border-purple-300"
                              >
                                <Upload className="w-5 h-5 text-purple-500" />
                                <span className="text-sm font-semibold text-gray-700">
                                  {clinicForm.undergraduateDiplomaFile
                                    ? `Diploma pregrado: ${clinicForm.undergraduateDiplomaFile.name}`
                                    : "Diploma pregrado"}
                                </span>
                              </label>
                              <input
                                id="clinic-diploma"
                                type="file"
                                className="hidden"
                                onChange={(e) =>
                                  setClinicForm({ ...clinicForm, undergraduateDiplomaFile: e.target.files?.[0] ?? null })
                                }
                              />
                              <FilePreview
                                file={clinicForm.undergraduateDiplomaFile}
                                url={clinicForm.undergraduateDiplomaUrl}
                                label="Diploma pregrado"
                              />
                              {(clinicForm.undergraduateDiplomaFile || clinicForm.undergraduateDiplomaUrl) ? (
                                <div className="flex items-center gap-2">
                                  <label
                                    htmlFor="clinic-diploma"
                                    className="inline-flex items-center rounded-xl bg-purple-600 px-3 py-2 text-xs font-semibold text-white"
                                  >
                                    Cambiar
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      queueDeleteUrl(clinicForm.undergraduateDiplomaUrl);
                                      setClinicForm({
                                        ...clinicForm,
                                        undergraduateDiplomaFile: null,
                                        undergraduateDiplomaUrl: "",
                                      });
                                    }}
                                    className="inline-flex items-center rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700"
                                  >
                                    Eliminar
                                  </button>
                                </div>
                              ) : null}

                            </div>
                          </section>
                        </>
                      ) : null}

                      {activePanelSection === "hours" ? (
                        <section>
                          <h2 className="text-2xl font-bold text-gray-900 mb-6">Horarios de atencion</h2>
                          <SchedulePicker
                            value={clinicForm.schedule}
                            onChange={(next) => setClinicForm({ ...clinicForm, schedule: next })}
                          />
                        </section>
                      ) : null}

                      {activePanelSection === "documents" ? (
                        <section>
                          <h2 className="text-2xl font-bold text-gray-900 mb-6">Documentos</h2>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <label
                                htmlFor="clinic-rut-docs"
                                className="flex items-center gap-3 border-2 border-dashed border-purple-200 rounded-2xl px-4 py-5 bg-gradient-to-br from-purple-50/80 via-white/70 to-purple-100/80 cursor-pointer hover:border-purple-300"
                              >
                                <Upload className="w-5 h-5 text-purple-500" />
                                <span className="text-sm font-semibold text-gray-700">
                                  {clinicForm.rutFile ? clinicForm.rutFile.name : "Foto del RUT"}
                                </span>
                              </label>
                              <input
                                id="clinic-rut-docs"
                                type="file"
                                className="hidden"
                                onChange={(e) =>
                                  setClinicForm({ ...clinicForm, rutFile: e.target.files?.[0] ?? null })
                                }
                              />
                            <FilePreview file={clinicForm.rutFile} url={clinicForm.rutUrl} label="RUT" />
                            {(clinicForm.rutFile || clinicForm.rutUrl) ? (
                              <div className="mt-2 flex items-center gap-2">
                                <label
                                  htmlFor="clinic-rut-docs"
                                  className="inline-flex items-center rounded-xl bg-purple-600 px-3 py-2 text-xs font-semibold text-white"
                                >
                                  Cambiar
                                </label>
                                <button
                                  type="button"
                                  onClick={() => {
                                    queueDeleteUrl(clinicForm.rutUrl);
                                    setClinicForm({
                                      ...clinicForm,
                                      rutFile: null,
                                      rutUrl: "",
                                    });
                                  }}
                                  className="inline-flex items-center rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700"
                                >
                                  Eliminar
                                </button>
                              </div>
                            ) : null}
                            </div>
                            <div>
                              <label
                                htmlFor="clinic-mercantile-docs"
                                className="flex items-center gap-3 border-2 border-dashed border-purple-200 rounded-2xl px-4 py-5 bg-gradient-to-br from-purple-50/80 via-white/70 to-purple-100/80 cursor-pointer hover:border-purple-300"
                              >
                                <Upload className="w-5 h-5 text-purple-500" />
                                <span className="text-sm font-semibold text-gray-700">
                                  {clinicForm.mercantileRegistryFile
                                    ? clinicForm.mercantileRegistryFile.name
                                    : "Registro mercantil"}
                                </span>
                              </label>
                              <input
                                id="clinic-mercantile-docs"
                                type="file"
                                className="hidden"
                                onChange={(e) =>
                                  setClinicForm({
                                    ...clinicForm,
                                    mercantileRegistryFile: e.target.files?.[0] ?? null,
                                  })
                                }
                              />
                            <FilePreview
                              file={clinicForm.mercantileRegistryFile}
                              url={clinicForm.mercantileRegistryUrl}
                              label="Registro mercantil"
                            />
                            {(clinicForm.mercantileRegistryFile || clinicForm.mercantileRegistryUrl) ? (
                              <div className="mt-2 flex items-center gap-2">
                                <label
                                  htmlFor="clinic-mercantile-docs"
                                  className="inline-flex items-center rounded-xl bg-purple-600 px-3 py-2 text-xs font-semibold text-white"
                                >
                                  Cambiar
                                </label>
                                <button
                                  type="button"
                                  onClick={() => {
                                    queueDeleteUrl(clinicForm.mercantileRegistryUrl);
                                    setClinicForm({
                                      ...clinicForm,
                                      mercantileRegistryFile: null,
                                      mercantileRegistryUrl: "",
                                    });
                                  }}
                                  className="inline-flex items-center rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700"
                                >
                                  Eliminar
                                </button>
                              </div>
                            ) : null}
                            </div>
                            <div>
                              <label
                                htmlFor="clinic-ica-docs"
                                className="flex items-center gap-3 border-2 border-dashed border-purple-200 rounded-2xl px-4 py-5 bg-gradient-to-br from-purple-50/80 via-white/70 to-purple-100/80 cursor-pointer hover:border-purple-300"
                              >
                                <Upload className="w-5 h-5 text-purple-500" />
                                <span className="text-sm font-semibold text-gray-700">
                                  {clinicForm.icaRegistryFile
                                    ? clinicForm.icaRegistryFile.name
                                    : "Registro ICA"}
                                </span>
                              </label>
                              <input
                                id="clinic-ica-docs"
                                type="file"
                                className="hidden"
                                onChange={(e) =>
                                  setClinicForm({
                                    ...clinicForm,
                                    icaRegistryFile: e.target.files?.[0] ?? null,
                                  })
                                }
                              />
                            <FilePreview
                              file={clinicForm.icaRegistryFile}
                              url={clinicForm.icaRegistryUrl}
                              label="Registro ICA"
                            />
                            {(clinicForm.icaRegistryFile || clinicForm.icaRegistryUrl) ? (
                              <div className="mt-2 flex items-center gap-2">
                                <label
                                  htmlFor="clinic-ica-docs"
                                  className="inline-flex items-center rounded-xl bg-purple-600 px-3 py-2 text-xs font-semibold text-white"
                                >
                                  Cambiar
                                </label>
                                <button
                                  type="button"
                                  onClick={() => {
                                    queueDeleteUrl(clinicForm.icaRegistryUrl);
                                    setClinicForm({
                                      ...clinicForm,
                                      icaRegistryFile: null,
                                      icaRegistryUrl: "",
                                    });
                                  }}
                                  className="inline-flex items-center rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700"
                                >
                                  Eliminar
                                </button>
                              </div>
                            ) : null}
                            </div>
                            <div>
                              <label
                                htmlFor="clinic-prof-card-docs"
                                className="flex items-center gap-3 border-2 border-dashed border-purple-200 rounded-2xl px-4 py-5 bg-gradient-to-br from-purple-50/80 via-white/70 to-purple-100/80 cursor-pointer hover:border-purple-300"
                              >
                                <Upload className="w-5 h-5 text-purple-500" />
                                <span className="text-sm font-semibold text-gray-700">
                                  {clinicForm.professionalCardFile
                                    ? clinicForm.professionalCardFile.name
                                    : "Tarjeta profesional"}
                                </span>
                              </label>
                              <input
                                id="clinic-prof-card-docs"
                                type="file"
                                className="hidden"
                                onChange={(e) =>
                                  setClinicForm({
                                    ...clinicForm,
                                    professionalCardFile: e.target.files?.[0] ?? null,
                                  })
                                }
                              />
                            <FilePreview
                              file={clinicForm.professionalCardFile}
                              url={clinicForm.professionalCardUrl}
                              label="Tarjeta profesional"
                            />
                            {(clinicForm.professionalCardFile || clinicForm.professionalCardUrl) ? (
                              <div className="mt-2 flex items-center gap-2">
                                <label
                                  htmlFor="clinic-prof-card-docs"
                                  className="inline-flex items-center rounded-xl bg-purple-600 px-3 py-2 text-xs font-semibold text-white"
                                >
                                  Cambiar
                                </label>
                                <button
                                  type="button"
                                  onClick={() => {
                                    queueDeleteUrl(clinicForm.professionalCardUrl);
                                    setClinicForm({
                                      ...clinicForm,
                                      professionalCardFile: null,
                                      professionalCardUrl: "",
                                    });
                                  }}
                                  className="inline-flex items-center rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700"
                                >
                                  Eliminar
                                </button>
                              </div>
                            ) : null}
                            </div>
                            <div>
                              <label
                                htmlFor="clinic-diploma-docs"
                                className="flex items-center gap-3 border-2 border-dashed border-purple-200 rounded-2xl px-4 py-5 bg-gradient-to-br from-purple-50/80 via-white/70 to-purple-100/80 cursor-pointer hover:border-purple-300"
                              >
                                <Upload className="w-5 h-5 text-purple-500" />
                                <span className="text-sm font-semibold text-gray-700">
                                  {clinicForm.undergraduateDiplomaFile
                                    ? clinicForm.undergraduateDiplomaFile.name
                                    : "Diploma pregrado"}
                                </span>
                              </label>
                              <input
                                id="clinic-diploma-docs"
                                type="file"
                                className="hidden"
                                onChange={(e) =>
                                  setClinicForm({
                                    ...clinicForm,
                                    undergraduateDiplomaFile: e.target.files?.[0] ?? null,
                                  })
                                }
                              />
                            <FilePreview
                              file={clinicForm.undergraduateDiplomaFile}
                              url={clinicForm.undergraduateDiplomaUrl}
                              label="Diploma pregrado"
                            />
                            {(clinicForm.undergraduateDiplomaFile || clinicForm.undergraduateDiplomaUrl) ? (
                              <div className="mt-2 flex items-center gap-2">
                                <label
                                  htmlFor="clinic-diploma-docs"
                                  className="inline-flex items-center rounded-xl bg-purple-600 px-3 py-2 text-xs font-semibold text-white"
                                >
                                  Cambiar
                                </label>
                                <button
                                  type="button"
                                  onClick={() => {
                                    queueDeleteUrl(clinicForm.undergraduateDiplomaUrl);
                                    setClinicForm({
                                      ...clinicForm,
                                      undergraduateDiplomaFile: null,
                                      undergraduateDiplomaUrl: "",
                                    });
                                  }}
                                  className="inline-flex items-center rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700"
                                >
                                  Eliminar
                                </button>
                              </div>
                            ) : null}
                            </div>
                          </div>
                        </section>
                      ) : null}

                      {activePanelSection === "preview" ? (
                        <section className="space-y-8">
                          <h2 className="text-2xl font-bold text-gray-900">Vista previa</h2>
                          <div className="space-y-4">
                            <p className="text-sm text-gray-600">
                              Así se verá en el directorio y en el perfil completo.
                            </p>
                            <h3 className="text-sm font-semibold uppercase tracking-widest text-purple-600/80">
                              Tarjeta en directorio
                            </h3>
                            <div className="max-w-md">
                              <DirectoryProfileCardPreview profile={clinicPreviewData} />
                            </div>
                          </div>

                          <div className="space-y-4">
                            <h3 className="text-sm font-semibold uppercase tracking-widest text-purple-600/80">
                              Perfil completo
                            </h3>
                            <FullProfilePreview profile={clinicPreviewData} />
                          </div>

                          {currentUserId ? (
                            <button
                              type="button"
                              onClick={() => router.push(`/veterinario/${currentUserId}`)}
                              className="rounded-2xl bg-gradient-to-r from-[#EC4899] to-[#4F46E5] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/30"
                            >
                              Ver pagina publica actual
                            </button>
                          ) : null}
                        </section>
                      ) : null}

                      {activePanelSection === "settings" ? (
                        <section className="space-y-6">
                          <h2 className="text-2xl font-bold text-gray-900">Configuración</h2>

                          <div className="rounded-3xl border border-purple-100 bg-white/70 p-6">
                            <h3 className="text-lg font-bold text-gray-900">Cambiar correo electrónico</h3>
                            <p className="mt-1 text-sm text-gray-600">
                              Correo actual:{" "}
                              <span className="font-semibold text-gray-800">
                                {accountCurrentEmail || "No disponible"}
                              </span>
                            </p>
                            <p className="mt-1 text-sm text-gray-600">
                              Ingresa el nuevo correo para enviarte un magic link de confirmación.
                            </p>
                            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                              <input
                                type="email"
                                value={accountNextEmail}
                                onChange={(e) => setAccountNextEmail(e.target.value)}
                                placeholder="Nuevo correo electrónico"
                                className="w-full px-4 py-3 border-2 border-purple-100 rounded-2xl bg-white/80"
                              />
                              <button
                                type="button"
                                onClick={handleUpdateAccountEmail}
                                disabled={accountSettingsLoading}
                                className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-[#EC4899] to-[#4F46E5] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/30 disabled:opacity-60"
                              >
                                {accountSettingsLoading ? "Enviando enlace..." : "Enviar magic link"}
                              </button>
                            </div>
                          </div>

                          <div className="rounded-3xl border border-purple-100 bg-white/70 p-6">
                            <h3 className="text-lg font-bold text-gray-900">Cambiar contraseña</h3>
                            <p className="mt-1 text-sm text-gray-600">
                              Te enviaremos un enlace al correo de tu cuenta para que cambies la contraseña de forma segura.
                            </p>
                            <div className="mt-4">
                              <button
                                type="button"
                                onClick={handleUpdateAccountPassword}
                                disabled={accountSettingsLoading}
                                className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-[#EC4899] to-[#4F46E5] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/30 disabled:opacity-60"
                              >
                                {accountSettingsLoading ? "Enviando enlace..." : "Enviar enlace para cambiar contraseña"}
                              </button>
                            </div>
                          </div>
                        </section>
                      ) : null}
                    </>
                  )}
                </div>
              )}

              {error ? <p className="text-sm text-red-600 mt-6">{error}</p> : null}
              {info ? <p className="text-sm text-emerald-600 mt-4">{info}</p> : null}

              {isInitialStep ||
              (activePanelSection !== "preview" && activePanelSection !== "settings") ? (
                <div className="mt-10 flex items-center justify-between">
                  {isInitialStep ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (window.history.length > 1) {
                          router.back();
                        } else {
                          router.push("/");
                        }
                      }}
                      className="inline-flex items-center rounded-2xl bg-gradient-to-r from-[#EC4899] to-[#4F46E5] px-8 py-4 text-base font-semibold text-white shadow-lg shadow-purple-500/30 transition transform hover:-translate-y-0.5 hover:shadow-xl hover:shadow-purple-500/40"
                    >
                      Volver
                    </button>
                  ) : (
                    <span />
                  )}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={
                      loading ||
                      vetPasswordsMismatch ||
                      clinicPasswordsMismatch ||
                      vetAboutTooLong ||
                      clinicAboutTooLong ||
                      (isInitialStep && !initialTermsAccepted)
                    }
                    className="inline-flex items-center gap-3 bg-gradient-to-r from-[#EC4899] to-[#4F46E5] text-white font-semibold py-4 px-8 rounded-2xl shadow-xl shadow-purple-500/30 hover:shadow-2xl hover:shadow-purple-500/40 disabled:opacity-60"
                  >
                    <Shield className="w-5 h-5" />
                    {loading ? "Enviando..." : isInitialStep ? "Enviar solicitud" : "Guardar cambios"}
                  </motion.button>
                </div>
              ) : null}
            </form>
          )}
            </motion.div>
            <Dialog open={showTermsDialog} onOpenChange={setShowTermsDialog}>
              <DialogContent className="max-w-3xl p-0 overflow-hidden border border-purple-100 bg-white rounded-2xl">
                <div className="border-b border-purple-100 bg-gradient-to-r from-purple-50 via-pink-50 to-blue-50 px-6 py-5">
                  <DialogHeader className="text-left">
                    <DialogTitle className="text-xl font-bold text-gray-900">{termsDocument.title}</DialogTitle>
                    <DialogDescription className="text-sm text-gray-600">
                      Última actualización: {termsDocument.lastUpdated}
                    </DialogDescription>
                  </DialogHeader>
                </div>
                <div className="max-h-[70vh] overflow-y-auto px-6 py-5 space-y-5">
                  <p className="text-sm leading-relaxed text-gray-700">{termsDocument.intro}</p>
                  {termsDocument.sections.map((section) => (
                    <section key={section.title} className="space-y-2">
                      <h4 className="text-sm font-semibold text-gray-900">{section.title}</h4>
                      {section.paragraphs.map((paragraph) => (
                        <p key={paragraph} className="text-sm leading-relaxed text-gray-700">
                          {paragraph}
                        </p>
                      ))}
                      {section.bullets?.length ? (
                        <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
                          {section.bullets.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      ) : null}
                    </section>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
            {showSuccessModal ? (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
                <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Perfil actualizado</h3>
                  <p className="text-sm text-gray-600 mb-6">
                    Nuestro equipo revisara tu informacion y te respondera en breve.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowSuccessModal(false)}
                    className="w-full rounded-2xl bg-purple-600 text-white py-3 text-sm font-semibold hover:bg-purple-700"
                  >
                    Entendido
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
