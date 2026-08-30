import type { HomePageContent, HomePageSections } from '../../../src/types'

export const homeSectionsFixture: HomePageSections = {
  hero: { eyebrow: 'LADYSTARS', title: 'Vẻ đẹp tự nhiên, được thiết kế riêng cho bạn.', description: 'Fixture trang chủ.', primary_label: 'Khám phá sản phẩm', primary_url: '/san-pham', secondary_label: 'Nhận tư vấn', secondary_url: '/lien-he', trust_items: ['Chất liệu được tuyển chọn'], note_label: 'Lựa chọn theo bạn', note_value: 'Màu · kiểu · mật độ' },
  consultation: { kicker: 'TƯ VẤN', title: 'Bắt đầu từ nhu cầu của bạn', description: 'Fixture tư vấn.', options: ['Che tóc thưa'], cta_label: 'Bắt đầu tư vấn', cta_url: '/lien-he' },
  products: { kicker: 'KHÁM PHÁ', title: 'Danh mục sản phẩm và dịch vụ', description: 'Fixture sản phẩm.', featured_label: 'Nổi bật', view_all_label: 'Xem sản phẩm', view_all_url: '/san-pham' },
  brand_story: { kicker: 'CÂU CHUYỆN', title: 'Câu chuyện thương hiệu', description: 'Fixture thương hiệu.', image_alt: 'Fixture', values: [{ title: 'Tự nhiên', description: 'Fixture' }], cta_label: 'Khám phá', cta_url: '/gioi-thieu' },
  solutions: { kicker: 'LỰA CHỌN', title: 'Giải pháp dành cho bạn', description: 'Fixture giải pháp.', bullets: ['Tư vấn theo nhu cầu', 'Thông tin rõ ràng', 'Hướng dẫn chăm sóc'], cta_label: 'Xem hướng dẫn', cta_url: '/dich-vu-cham-soc', art_text: 'Fixture', image_path: null, image_alt: 'Fixture' },
  styles: { kicker: 'PHONG CÁCH', title: 'Cảm hứng phong cách', items: [{ title: 'Phong cách 1', description: 'Fixture', url: '/san-pham', image_path: null, image_alt: 'Fixture' }, { title: 'Phong cách 2', description: 'Fixture', url: '/san-pham', image_path: null, image_alt: 'Fixture' }] },
  process: { kicker: 'QUY TRÌNH LADYSTARS', title: 'Quy trình LADYSTARS', description: 'Fixture quy trình.', steps: [{ number: '01', title: 'Bước 01', description: 'Fixture', image_path: null, image_alt: 'Fixture' }], cta_label: 'Đặt lịch', cta_url: '/lien-he' },
  testimonials: { kicker: 'CẢM NHẬN', title: 'Cảm nhận khách hàng', items: [{ quote: 'Fixture', customer: 'Khách hàng', label: 'Fixture', detail_title: 'Cảm nhận 1', detail: 'Fixture', image_path: null, image_alt: 'Fixture' }] },
  contact: { kicker: 'LIÊN HỆ', title: 'Kết nối', description: 'Fixture liên hệ.', cards: [{ title: 'Đặt lịch', description: 'Fixture', url: '/lien-he' }] },
  insights: { kicker: 'THÔNG TIN', title: 'Thông tin hữu ích', items: [{ title: 'Hướng dẫn', description: 'Fixture', url: '/dich-vu-cham-soc' }] },
  final_cta: { kicker: 'BẮT ĐẦU', title: 'Sẵn sàng bắt đầu?', description: 'Fixture CTA.', primary_label: 'Nhận tư vấn riêng', primary_url: '/lien-he', secondary_label: 'Xem sản phẩm', secondary_url: '/san-pham' },
  floating_contact: { trigger_label: 'Hỗ trợ', consultation_label: 'Đặt lịch tư vấn', consultation_url: '/lien-he', guide_label: 'Xem hướng dẫn', guide_url: '/dich-vu-cham-soc' },
}

export const homeContentFixture: HomePageContent = { id: 1, page_key: 'home', announcement_messages: ['LADYSTARS'], announcement_interval_seconds: 5, announcement_enabled: true, hero_image_path: '/images/brand/ladystars-hero.svg', hero_image_alt: 'Hero', brand_story_image_path: '/images/brand/ladystars-hero.svg', sections: homeSectionsFixture }
