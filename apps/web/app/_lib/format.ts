import type {
  GiftMethod,
  ModerationStatus,
  PlanCategory,
  Relation,
  RsvpStatus,
  Side,
} from '@repo/contracts';

const TZ = 'Asia/Ho_Chi_Minh';

export const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: TZ,
  }).format(new Date(iso));

export const formatTime = (iso: string) =>
  new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TZ,
  }).format(new Date(iso));

export const formatDateTime = (iso: string) =>
  new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TZ,
  }).format(new Date(iso));

export const formatVnd = (value: string | number | null | undefined) =>
  value == null || value === ''
    ? '—'
    : new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
      }).format(Number(value));

/** ISO string -> value for <input type="datetime-local"> in Vietnam time */
export const toLocalInput = (iso: string | null | undefined) => {
  if (!iso) return '';
  const d = new Date(new Date(iso).getTime() + 7 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 16);
};

/** <input type="datetime-local"> value (Vietnam time) -> ISO string */
export const fromLocalInput = (value: string) =>
  value ? `${value}:00+07:00` : undefined;

export const SIDE_LABEL: Record<Side, string> = {
  BRIDE: 'Nhà gái',
  GROOM: 'Nhà trai',
  BOTH: 'Hai họ',
};

export const RSVP_LABEL: Record<RsvpStatus, string> = {
  PENDING: 'Chưa trả lời',
  ATTENDING: 'Tham dự',
  DECLINED: 'Không tham dự',
  MAYBE: 'Chưa chắc',
};

export const MODERATION_LABEL: Record<ModerationStatus, string> = {
  PENDING: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  HIDDEN: 'Đã ẩn',
};

export const GIFT_METHOD_LABEL: Record<GiftMethod, string> = {
  CASH: 'Tiền mặt',
  BANK_TRANSFER: 'Chuyển khoản',
  GOLD: 'Vàng',
  OTHER: 'Khác',
};

export const RELATION_LABEL: Record<Relation, string> = {
  FAMILY: 'Gia đình',
  RELATIVE: 'Họ hàng',
  FRIEND: 'Bạn bè',
  COLLEAGUE: 'Đồng nghiệp',
  NEIGHBOR: 'Hàng xóm',
  OTHER: 'Khác',
};

export const vietQrUrl = (
  bankBin: string,
  accountNumber: string,
  accountName: string,
) =>
  `https://img.vietqr.io/image/${bankBin}-${accountNumber}-compact2.png?accountName=${encodeURIComponent(accountName)}`;

export const PLAN_CATEGORY_LABEL: Record<PlanCategory, string> = {
  VENUE: 'Địa điểm',
  FOOD: 'Tiệc & cỗ',
  ATTIRE: 'Trang phục',
  PHOTO: 'Ảnh & quay phim',
  DECOR: 'Trang trí',
  CEREMONY: 'Nghi lễ',
  INVITATION: 'Thiệp & khách mời',
  RINGS: 'Nhẫn cưới',
  BEAUTY: 'Làm đẹp',
  ENTERTAINMENT: 'MC & âm nhạc',
  TRANSPORT: 'Xe cộ',
  GIFTS: 'Quà & phong bì',
  PAPERWORK: 'Giấy tờ',
  HONEYMOON: 'Trăng mật',
  OTHER: 'Khác',
};

/** Compact VND for tight spots: 150 tr, 1,2 tỷ. */
export const formatVndShort = (value: string | number | bigint) => {
  const v = Number(value);
  if (Math.abs(v) >= 1e9)
    return `${(v / 1e9).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} tỷ`;
  if (Math.abs(v) >= 1e6)
    return `${(v / 1e6).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tr`;
  return v.toLocaleString('vi-VN');
};

export const formatDay = (iso: string) =>
  new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date(iso));

/** ISO → value for <input type="date"> in Vietnam time. */
export const toDateInput = (iso: string | null | undefined) =>
  iso
    ? new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(
        new Date(iso),
      )
    : '';

/** <input type="date"> value → ISO at midnight Vietnam time. */
export const fromDateInput = (value: string) =>
  value ? `${value}T00:00:00+07:00` : null;

const vnDay = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Ho_Chi_Minh',
});

/** Calendar days from today until `iso` in Vietnam time (negative when past). */
export const daysUntil = (iso: string) => {
  const day = (d: Date) => Date.parse(`${vnDay.format(d)}T00:00:00Z`);
  return Math.round((day(new Date(iso)) - day(new Date())) / 86_400_000);
};
