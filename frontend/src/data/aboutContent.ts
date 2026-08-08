import type { AboutSection } from '../types'

export const ABOUT_SECTION_ICONS = ['heart', 'sparkles', 'gem', 'shield-check', 'leaf', 'scissors', 'star', 'users', 'compass', 'hand-heart', 'messages-square', 'badge-check'] as const

export const aboutFallbackSections: AboutSection[] = [
  {
    section_key: 'hero', section_type: 'hero', sort_order: 1,
    eyebrow: 'CÂU CHUYỆN LADYSTARS',
    title: 'Không chỉ là mái tóc, đó là cách bạn cảm nhận về chính mình.',
    subtitle: 'LADYSTARS tạo ra những lựa chọn tóc tự nhiên, tinh tế và vừa vặn với nhịp sống riêng của bạn — để mỗi ngày bắt đầu bằng cảm giác tự tin hơn.',
    image_path: '/images/brand/ladystars-hero.svg', image_alt: 'Minh họa phong cách tóc mềm mại của LADYSTARS',
    cta_label: 'Khám phá sản phẩm', cta_url: '/san-pham',
    settings: { secondary_cta_label: 'Nhận tư vấn riêng', secondary_cta_url: '/lien-he', image_badge: 'Hair system · Toupee · Personal styling', trust_items: ['Tự nhiên trong từng chi tiết', 'Lựa chọn theo nhu cầu riêng', 'Đồng hành lâu dài'] },
  },
  {
    section_key: 'introduction', section_type: 'rich_text_image', sort_order: 2,
    eyebrow: 'ĐIỀU ĐỨNG SAU LADYSTARS',
    title: 'Một lựa chọn đẹp chỉ thật sự ý nghĩa khi nó khiến bạn thấy là chính mình.',
    body: 'LADYSTARS bắt đầu từ một câu hỏi đơn giản: làm thế nào để việc lựa chọn tóc trở nên rõ ràng, nhẹ nhàng và phù hợp hơn với từng người? Từ chất liệu, kiểu đế, màu sắc đến cách tư vấn, mọi chi tiết đều được xây dựng để bạn cảm thấy thoải mái khi đưa ra quyết định.',
    image_path: '/images/brand/ladystars-hero.svg', image_alt: 'Không gian tư vấn tinh tế của LADYSTARS',
    settings: { layout: 'image-left', quote: 'Vẻ đẹp tự nhiên không cần phải ồn ào. Nó chỉ cần vừa vặn với bạn.', floating_card: { title: 'LADYSTARS', subtitle: 'Personalized hair experience' } },
  },
  {
    section_key: 'story-empathy', section_type: 'rich_text_image', sort_order: 3,
    eyebrow: 'KHỞI NGUỒN', title: 'Bắt đầu từ sự lắng nghe',
    body: 'Mỗi người đến với LADYSTARS mang theo một nhu cầu rất riêng: có người cần che vùng tóc thưa, có người muốn một diện mạo chỉn chu hơn, có người chỉ muốn thay đổi nhẹ nhàng mà vẫn giữ nét tự nhiên vốn có. Chúng tôi không áp một công thức chung cho tất cả. Mọi tư vấn đều bắt đầu từ việc hiểu nhu cầu, thói quen và cảm giác mà bạn mong muốn.',
    image_path: '/images/brand/ladystars-hero.svg', image_alt: 'Chất liệu tóc được tuyển chọn kỹ',
    settings: { layout: 'image-right', pills: ['Tự nhiên', 'Thoải mái', 'Vừa vặn'] },
  },
  {
    section_key: 'story-journey', section_type: 'rich_text_image', sort_order: 4,
    eyebrow: 'HÀNH TRÌNH', title: 'Từ một giải pháp tóc đến một trải nghiệm cá nhân hóa',
    body: 'LADYSTARS liên tục hoàn thiện cách lựa chọn và tư vấn tóc: chú trọng chất liệu, kiểu đế, độ tự nhiên, màu sắc và cảm giác khi sử dụng. Một giải pháp tốt không chỉ đẹp khi nhìn gần mà còn phải hòa vào sinh hoạt hằng ngày. Và trải nghiệm mua hàng cần rõ ràng, dễ hiểu, không gây áp lực.',
    image_path: '/images/brand/ladystars-hero.svg', image_alt: 'Hành trình hoàn thiện trải nghiệm tóc',
    settings: { layout: 'image-left', steps: [{ label: '01', title: 'Lắng nghe' }, { label: '02', title: 'Tuyển chọn' }, { label: '03', title: 'Hoàn thiện' }] },
  },
  {
    section_key: 'process', section_type: 'timeline', sort_order: 5,
    eyebrow: 'QUY TRÌNH LADYSTARS', title: 'Cách chúng tôi tạo nên từng trải nghiệm',
    subtitle: 'Bốn bước rõ ràng để mỗi lựa chọn đều bắt đầu từ bạn và kết thúc bằng sự tự tin.',
    settings: { items: [
      { icon: 'heart', title: 'Lắng nghe', description: 'Bắt đầu từ nhu cầu, thói quen và phong cách riêng của từng người.' },
      { icon: 'sparkles', title: 'Tuyển chọn', description: 'Chọn chất liệu, kiểu đế, màu và mật độ phù hợp với trải nghiệm mong muốn.' },
      { icon: 'gem', title: 'Tinh chỉnh', description: 'Hoàn thiện để tổng thể tự nhiên, thoải mái và dễ hòa vào cuộc sống hằng ngày.' },
      { icon: 'hand-heart', title: 'Đồng hành', description: 'Tiếp tục hỗ trợ sau lựa chọn để bạn luôn cảm thấy tự tin với diện mạo của mình.' },
    ] },
  },
  {
    section_key: 'direction', section_type: 'showcase', sort_order: 6,
    eyebrow: 'ĐỊNH HƯỚNG', title: 'Định hướng của LADYSTARS',
    subtitle: 'LADYSTARS hướng đến một trải nghiệm tóc hiện đại, nơi vẻ đẹp tự nhiên, sự thoải mái và khả năng cá nhân hóa được đặt ngang hàng với chất lượng sản phẩm.',
    image_path: '/images/brand/ladystars-hero.svg', image_alt: 'Không gian trải nghiệm LADYSTARS',
    settings: { caption_title: 'Designed around you', caption_subtitle: 'Tự nhiên hơn mỗi ngày', items: [
      { icon: 'leaf', title: 'Đẹp tự nhiên', description: 'Ưu tiên sự hài hòa và cảm giác thật trong từng chi tiết.' },
      { icon: 'compass', title: 'Dễ lựa chọn', description: 'Thông tin rõ ràng để bạn quyết định theo nhịp của mình.' },
      { icon: 'users', title: 'Đồng hành lâu dài', description: 'Ở lại cùng bạn sau mỗi lựa chọn, không chỉ lúc mua.' },
    ] },
  },
  {
    section_key: 'commitments', section_type: 'cards', sort_order: 7,
    eyebrow: 'CAM KẾT', title: 'Những điều LADYSTARS luôn giữ vững',
    subtitle: 'Bốn giá trị làm nền cho mọi sản phẩm và cuộc trò chuyện tư vấn.',
    settings: { items: [
      { icon: 'shield-check', title: 'Chất lượng rõ ràng', description: 'Thông tin về chất liệu, kiểu dáng, kích thước và chính sách được trình bày minh bạch.' },
      { icon: 'messages-square', title: 'Tư vấn có trách nhiệm', description: 'Gợi ý dựa trên nhu cầu thực tế, không tạo áp lực và không cố bán một lựa chọn không phù hợp.' },
      { icon: 'leaf', title: 'Trải nghiệm tự nhiên', description: 'Tập trung vào cảm giác thoải mái, vẻ ngoài hài hòa và khả năng sử dụng trong đời sống hằng ngày.' },
      { icon: 'heart', title: 'Bạn là trung tâm', description: 'Mỗi lựa chọn bắt đầu từ bạn, không phải từ một công thức chung áp dụng cho tất cả.' },
    ] },
  },
  {
    section_key: 'goals', section_type: 'goals', sort_order: 8,
    eyebrow: 'MỤC TIÊU DÀI HẠN', title: 'LADYSTARS muốn cùng bạn đi xa hơn',
    subtitle: 'Ba mục tiêu giản dị nhưng kiên định cho hành trình phía trước.',
    settings: { items: [
      { icon: 'leaf', title: 'Tự nhiên hơn', description: 'Giúp mỗi người tìm được lựa chọn hòa hợp với diện mạo, phong cách và nhịp sống của mình.' },
      { icon: 'compass', title: 'Rõ ràng hơn', description: 'Đơn giản hóa cách tìm hiểu, lựa chọn và chăm sóc tóc để khách hàng luôn cảm thấy chủ động.' },
      { icon: 'hand-heart', title: 'Bền vững hơn', description: 'Xây dựng trải nghiệm thương hiệu tử tế, lâu dài và có giá trị thật sau mỗi lần khách hàng sử dụng.' },
    ] },
  },
  {
    section_key: 'testimonials', section_type: 'testimonials', sort_order: 9,
    eyebrow: 'ĐỘI NGŨ', title: 'Những người tạo nên trải nghiệm LADYSTARS',
    subtitle: 'Phía sau mỗi lựa chọn là một đội ngũ lắng nghe và đồng hành cùng bạn.',
    settings: { items: [
      { quote: 'Điều mình thích nhất là được lắng nghe câu chuyện của từng khách hàng và giúp họ tìm ra lựa chọn khiến họ cảm thấy thoải mái hơn.', name: 'Minh Anh', role: 'Tư vấn viên', rating: 5 },
      { quote: 'Một kiểu tóc đẹp là kiểu khiến bạn quên mất mình đang đội tóc giả — chỉ còn cảm giác tự tin rất thật.', name: 'Thu Hà', role: 'Stylist', rating: 5 },
      { quote: 'Chúng mình luôn ở lại sau mỗi đơn hàng, vì chăm sóc và hướng dẫn đúng cách mới là phần quan trọng nhất.', name: 'Ngọc Trâm', role: 'Chăm sóc khách hàng', rating: 5 },
    ] },
  },
  {
    section_key: 'final-cta', section_type: 'cta', sort_order: 10,
    eyebrow: 'BẮT ĐẦU CÙNG LADYSTARS', title: 'Sẵn sàng tìm lựa chọn phù hợp với bạn?',
    subtitle: 'Hãy bắt đầu bằng một cuộc trò chuyện nhẹ nhàng. LADYSTARS sẽ cùng bạn tìm hiểu kiểu tóc, chất liệu và giải pháp phù hợp nhất.',
    cta_label: 'Nhận tư vấn riêng', cta_url: '/lien-he',
    settings: { secondary_cta_label: 'Xem sản phẩm', secondary_cta_url: '/san-pham' },
  },
]
