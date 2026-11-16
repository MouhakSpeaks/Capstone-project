import './Footer.css'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <span>📚 BookHaven</span>
          <p>Your one-stop online bookstore. Discover, browse and buy books from every genre.</p>
        </div>
        <div className="footer-links">
          <h4>Shop</h4>
          <a href="/catalogue">All Books</a>
          <a href="/catalogue?category=fiction">Fiction</a>
          <a href="/catalogue?category=technology">Technology</a>
          <a href="/catalogue?category=science">Science</a>
        </div>
        <div className="footer-links">
          <h4>Account</h4>
          <a href="/orders">My Orders</a>
          <a href="/cart">Cart</a>
          <a href="/login">Sign In</a>
          <a href="/register">Register</a>
        </div>
        <div className="footer-links">
          <h4>Help</h4>
          <a href="#">Returns Policy</a>
          <a href="#">Track Order</a>
          <a href="#">Contact Us</a>
        </div>
      </div>
      <div className="footer-bottom">
        <div className="container">
          © {new Date().getFullYear()} BookHaven — AI Capstone Project
        </div>
      </div>
    </footer>
  )
}
