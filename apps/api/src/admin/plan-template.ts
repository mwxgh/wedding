import { PlanCategory, Side } from '@repo/db';

/*
 * Starter checklist for a Vietnamese wedding. `weeksBefore` is counted back
 * from the wedding date to set each task's due date.
 */

export interface TemplateTask {
  title: string;
  category: PlanCategory;
  weeksBefore: number;
  assignee?: Side;
}

export const TEMPLATE_TASKS: TemplateTask[] = [
  // ~6 months before
  {
    title: 'Xem ngày, chốt ngày cưới',
    category: PlanCategory.CEREMONY,
    weeksBefore: 26,
  },
  {
    title: 'Lên ngân sách tổng và chia phần hai bên',
    category: PlanCategory.OTHER,
    weeksBefore: 26,
  },
  {
    title: 'Lập danh sách khách mời sơ bộ',
    category: PlanCategory.INVITATION,
    weeksBefore: 24,
  },
  {
    title: 'Chọn và đặt cọc nhà hàng / địa điểm tiệc',
    category: PlanCategory.VENUE,
    weeksBefore: 24,
  },
  {
    title: 'Chọn studio, đặt lịch chụp ảnh cưới',
    category: PlanCategory.PHOTO,
    weeksBefore: 22,
  },
  // ~3-5 months before
  {
    title: 'Chụp ảnh cưới (pre-wedding)',
    category: PlanCategory.PHOTO,
    weeksBefore: 16,
  },
  {
    title: 'Chọn váy cưới, áo dài và vest',
    category: PlanCategory.ATTIRE,
    weeksBefore: 16,
  },
  {
    title: 'Đặt trang trí, cổng hoa, phông cưới',
    category: PlanCategory.DECOR,
    weeksBefore: 14,
  },
  {
    title: 'Đặt MC, ban nhạc / ca sĩ',
    category: PlanCategory.ENTERTAINMENT,
    weeksBefore: 14,
  },
  { title: 'Mua nhẫn cưới', category: PlanCategory.RINGS, weeksBefore: 12 },
  {
    title: 'Chốt mẫu và in thiệp cưới',
    category: PlanCategory.INVITATION,
    weeksBefore: 10,
  },
  {
    title: 'Đặt make-up và làm tóc cô dâu',
    category: PlanCategory.BEAUTY,
    weeksBefore: 10,
    assignee: Side.BRIDE,
  },
  // ~1-2 months before
  {
    title: 'Đăng ký kết hôn',
    category: PlanCategory.PAPERWORK,
    weeksBefore: 8,
  },
  {
    title: 'Đặt xe hoa, xe đưa đón họ hàng',
    category: PlanCategory.TRANSPORT,
    weeksBefore: 8,
    assignee: Side.GROOM,
  },
  {
    title: 'Chuẩn bị lễ ăn hỏi: tráp, đội bê tráp',
    category: PlanCategory.CEREMONY,
    weeksBefore: 7,
  },
  {
    title: 'Gửi thiệp mời và link thiệp online',
    category: PlanCategory.INVITATION,
    weeksBefore: 6,
  },
  {
    title: 'Thử váy và vest lần cuối',
    category: PlanCategory.ATTIRE,
    weeksBefore: 4,
  },
  {
    title: 'Chọn quà cảm ơn khách',
    category: PlanCategory.GIFTS,
    weeksBefore: 4,
  },
  {
    title: 'Đặt phòng / vé đi trăng mật',
    category: PlanCategory.HONEYMOON,
    weeksBefore: 4,
  },
  // last 2 weeks
  {
    title: 'Chốt số khách với nhà hàng',
    category: PlanCategory.FOOD,
    weeksBefore: 2,
  },
  { title: 'Xếp bàn cho khách', category: PlanCategory.VENUE, weeksBefore: 2 },
  {
    title: 'Lên lịch trình chi tiết ngày cưới',
    category: PlanCategory.CEREMONY,
    weeksBefore: 2,
  },
  {
    title: 'Gọi xác nhận lại tất cả nhà cung cấp',
    category: PlanCategory.OTHER,
    weeksBefore: 1,
  },
  {
    title: 'Thanh toán phần còn lại cho nhà cung cấp',
    category: PlanCategory.OTHER,
    weeksBefore: 1,
  },
  {
    title: 'Chuẩn bị tiền lẻ, phong bì, hộp mừng',
    category: PlanCategory.GIFTS,
    weeksBefore: 1,
  },
];

/** Common cost lines; estimates start at 0 for the couple to fill in. */
export const TEMPLATE_EXPENSES: {
  category: PlanCategory;
  name: string;
  side?: Side;
}[] = [
  { category: PlanCategory.VENUE, name: 'Nhà hàng / địa điểm tiệc' },
  { category: PlanCategory.FOOD, name: 'Cỗ cưới (theo mâm)' },
  { category: PlanCategory.ATTIRE, name: 'Váy cưới, áo dài', side: Side.BRIDE },
  { category: PlanCategory.ATTIRE, name: 'Vest chú rể', side: Side.GROOM },
  { category: PlanCategory.PHOTO, name: 'Chụp ảnh cưới (pre-wedding)' },
  { category: PlanCategory.PHOTO, name: 'Quay phim, chụp ảnh ngày cưới' },
  { category: PlanCategory.DECOR, name: 'Trang trí, cổng hoa' },
  {
    category: PlanCategory.CEREMONY,
    name: 'Lễ ăn hỏi: tráp, lễ vật',
    side: Side.GROOM,
  },
  { category: PlanCategory.INVITATION, name: 'In thiệp cưới' },
  { category: PlanCategory.RINGS, name: 'Nhẫn cưới' },
  { category: PlanCategory.BEAUTY, name: 'Make-up, làm tóc', side: Side.BRIDE },
  { category: PlanCategory.ENTERTAINMENT, name: 'MC, ban nhạc' },
  {
    category: PlanCategory.TRANSPORT,
    name: 'Xe hoa, xe đưa đón',
    side: Side.GROOM,
  },
  { category: PlanCategory.GIFTS, name: 'Quà cảm ơn khách' },
  { category: PlanCategory.HONEYMOON, name: 'Trăng mật' },
];
