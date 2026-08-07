import { ArrowRight, CalendarDays, Check, ChevronLeft, ChevronRight, MessageCircle, MoveUpRight, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { brandValues, insightLinks, serviceSteps, styleDirections, testimonials } from '../../data/homeContent'

export function BrandStory() {
  return <section className="home-story-section"><div className="container-page home-story-grid"><div className="home-story-image"><img src="/images/brand/ladystars-hero.svg" alt="Minh họa phong cách mềm mại của LADYSTARS" /></div><div className="home-story-copy"><p className="home-kicker">CÂU CHUYỆN LADYSTARS</p><h2>Không chỉ là mái tóc, đó là cách bạn cảm nhận về chính mình.</h2><p>LADYSTARS hướng đến trải nghiệm lựa chọn tóc rõ ràng, nhẹ nhàng và tôn trọng dấu ấn riêng của mỗi người.</p><div className="home-value-grid">{brandValues.map(([title, description]) => <div key={title}><Check size={18} /><div><h3>{title}</h3><p>{description}</p></div></div>)}</div><Link to="/gioi-thieu" className="btn-secondary">Khám phá LADYSTARS <ArrowRight size={18} /></Link></div></div></section>
}

export function SolutionsAndStyles() {
  return <><section className="container-page home-section home-solution-grid"><div className="home-solution-copy"><p className="home-kicker">LỰA CHỌN DÀNH CHO BẠN</p><h2>Giải pháp tinh tế cho từng mong muốn riêng.</h2><p>Từ cảm giác tự nhiên hằng ngày đến một diện mạo mới mẻ, LADYSTARS giúp bạn hiểu rõ lựa chọn trước khi quyết định.</p><ul>{['Gợi ý theo nhu cầu và phong cách', 'Dễ dàng hình dung chất liệu và kiểu tóc', 'Hướng dẫn sử dụng, chăm sóc rõ ràng'].map((item) => <li key={item}><Check size={18} />{item}</li>)}</ul><Link to="/huong-dan-chon-toc" className="btn-primary">Xem hướng dẫn lựa chọn <ArrowRight size={18} /></Link></div><div className="home-solution-art" aria-hidden="true"><span>L</span><span>S</span><p>Soft style,<br />strong confidence.</p></div></section><section className="container-page home-section" aria-labelledby="style-inspiration-title"><div className="home-section-heading"><p className="home-kicker"><Sparkles size={15} /> STYLE INSPIRATION</p><h2 id="style-inspiration-title">Tìm cảm hứng cho phong cách của bạn</h2></div><div className="home-style-grid">{styleDirections.map(([title, description], index) => <Link to="/san-pham" className={`home-style-card home-style-card-${index + 1}`} key={title}><span>0{index + 1}</span><div><h3>{title}</h3><p>{description}</p><strong>Khám phá <MoveUpRight size={17} /></strong></div></Link>)}</div></section></>
}

export function ServiceProcess() {
  return <section className="home-process-section"><div className="container-page"><div className="home-section-heading home-section-heading-center"><p className="home-kicker">QUY TRÌNH LADYSTARS</p><h2>Đồng hành cùng bạn, từng bước nhẹ nhàng</h2><p>Bốn bước đơn giản để bạn bắt đầu với cảm giác chủ động và tự tin hơn.</p></div><div className="home-process-grid">{serviceSteps.map(([number, title, description]) => <article key={number}><span>{number}</span><h3>{title}</h3><p>{description}</p></article>)}</div><div className="home-center-action"><Link to="/lien-he" className="btn-primary">Đặt lịch tư vấn <CalendarDays size={18} /></Link></div></div></section>
}

export function Testimonials() {
  const [activeIndex, setActiveIndex] = useState(0)
  const activeTestimonial = testimonials[activeIndex]
  const showPrevious = () => setActiveIndex((index) => (index - 1 + testimonials.length) % testimonials.length)
  const showNext = () => setActiveIndex((index) => (index + 1) % testimonials.length)
  return <section className="container-page home-section" aria-labelledby="testimonial-title"><div className="home-section-heading home-testimonial-heading"><div><p className="home-kicker">CẢM NHẬN TỪ KHÁCH HÀNG</p><h2 id="testimonial-title">Những câu chuyện đầy tự tin</h2></div><div className="home-carousel-controls"><button type="button" onClick={showPrevious} aria-label="Xem cảm nhận trước"><ChevronLeft size={20} /></button><button type="button" onClick={showNext} aria-label="Xem cảm nhận tiếp theo"><ChevronRight size={20} /></button></div></div><div className="home-testimonial-grid">{testimonials.map(([quote, customer, label], index) => <article className={index === activeIndex ? 'is-active' : ''} key={quote}><span>“</span><p>{quote}</p><strong>{customer}</strong><small>{label}</small></article>)}</div><article className="home-testimonial-mobile"><span>“</span><p>{activeTestimonial[0]}</p><strong>{activeTestimonial[1]}</strong><small>{activeTestimonial[2]}</small></article></section>
}

export function ContactAndInsights() {
  return <><section className="home-contact-section"><div className="container-page home-contact-grid"><div><p className="home-kicker">KẾT NỐI LADYSTARS</p><h2>Chọn cách bắt đầu phù hợp với bạn.</h2><p>Đội ngũ LADYSTARS sẵn sàng lắng nghe nhu cầu và giúp bạn tìm đúng bước tiếp theo.</p></div><div className="home-contact-cards"><Link to="/lien-he"><CalendarDays size={23} /><div><h3>Đặt lịch tư vấn</h3><p>Chọn thời điểm thuận tiện để bắt đầu cuộc trò chuyện.</p></div><ArrowRight size={19} /></Link><Link to="/huong-dan-chon-toc"><MessageCircle size={23} /><div><h3>Nhận hướng dẫn</h3><p>Tìm hiểu các tiêu chí quan trọng trước khi lựa chọn.</p></div><ArrowRight size={19} /></Link></div></div></section><section className="container-page home-section" aria-labelledby="insights-title"><div className="home-section-heading home-section-heading-center"><p className="home-kicker">CẨM NANG LADYSTARS</p><h2 id="insights-title">Thông tin hữu ích trước khi lựa chọn</h2></div><div className="home-insight-grid">{insightLinks.map(([title, description, path], index) => <Link to={path} key={title} className={index === 0 ? 'is-featured' : ''}><span>0{index + 1}</span><h3>{title}</h3><p>{description}</p><strong>Đọc thêm <ArrowRight size={17} /></strong></Link>)}</div></section></>
}

export function HomeFinalCta() {
  return <section className="container-page home-final-cta"><div><p className="home-kicker">BẮT ĐẦU CÙNG LADYSTARS</p><h2>Bạn đã sẵn sàng tìm kiểu tóc dành riêng cho mình?</h2><p>Khám phá sản phẩm hoặc nhận hướng dẫn từ đội ngũ LADYSTARS theo nhịp của riêng bạn.</p></div><div><Link to="/lien-he" className="btn-light">Đặt lịch tư vấn <CalendarDays size={18} /></Link><Link to="/san-pham" className="home-cta-text-link">Khám phá sản phẩm <ArrowRight size={18} /></Link></div></section>
}

export function FloatingContactDock() {
  const [open, setOpen] = useState(false)
  return <div className={`home-contact-dock ${open ? 'is-open' : ''}`}><div className="home-contact-dock-links"><Link to="/lien-he" aria-label="Đặt lịch tư vấn"><CalendarDays size={19} /></Link><Link to="/huong-dan-chon-toc" aria-label="Xem hướng dẫn lựa chọn"><MessageCircle size={19} /></Link><button type="button" aria-label="Trở về đầu trang" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>↑</button></div><button type="button" className="home-contact-dock-trigger" aria-label="Mở hỗ trợ" aria-expanded={open} onClick={() => setOpen((current) => !current)}><MessageCircle size={20} /><span>Hỗ trợ</span></button></div>
}
