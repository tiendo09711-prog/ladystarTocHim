import { ArrowRight, CalendarDays, Check, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'

export function HomeHero() {
  return <section className="home-hero-shell" aria-labelledby="home-hero-title">
    <div className="home-hero container-page">
      <div className="home-hero-copy">
        <div className="home-eyebrow"><Sparkles size={16} /> LADYSTARS · HAIR SYSTEM & TOUPEE</div>
        <h1 id="home-hero-title">Vẻ đẹp tự nhiên, được thiết kế riêng cho bạn.</h1>
        <p>Khám phá giải pháp tóc được lựa chọn theo chất liệu, kiểu đế, màu sắc và nhu cầu sử dụng của riêng bạn.</p>
        <div className="home-hero-actions">
          <Link to="/san-pham" className="btn-primary">Khám phá sản phẩm <ArrowRight size={18} /></Link>
          <Link to="/lien-he" className="btn-secondary">Nhận tư vấn <CalendarDays size={18} /></Link>
        </div>
        <ul className="home-trust-list">
          {['Chất liệu được tuyển chọn', 'Tư vấn theo nhu cầu', 'Chính sách rõ ràng'].map((item) => <li key={item}><Check size={16} />{item}</li>)}
        </ul>
      </div>
      <div className="home-hero-visual" aria-hidden="true">
        <img src="/images/brand/ladystars-hero.svg" alt="" />
        <div className="home-hero-note"><span>Lựa chọn theo bạn</span><strong>Màu · kiểu · mật độ</strong></div>
      </div>
    </div>
  </section>
}

export function QuickConsultation() {
  return <section className="container-page home-consultation-wrap" aria-labelledby="quick-consultation-title">
    <div className="home-consultation">
      <div><p className="home-kicker">TƯ VẤN CÙNG LADYSTARS</p><h2 id="quick-consultation-title">Chưa biết nên bắt đầu từ đâu?</h2><p>Chọn điều bạn đang quan tâm, LADYSTARS sẽ hướng dẫn bước tiếp theo phù hợp.</p></div>
      <div className="home-consultation-options" aria-label="Nhu cầu tư vấn">
        <span>Che tóc thưa</span><span>Che vùng đỉnh</span><span>Thay đổi kiểu tóc</span>
      </div>
      <Link to="/dich-vu-cham-soc" className="btn-primary">Bắt đầu tư vấn <ArrowRight size={18} /></Link>
    </div>
  </section>
}
