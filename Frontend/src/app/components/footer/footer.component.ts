import { Component, OnInit, ElementRef } from '@angular/core';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.css']
})
export class FooterComponent implements OnInit {

  constructor(private el: ElementRef) {}

  ngOnInit(): void {
    this.initializeFooter();
    this.setCurrentYear();
    this.initializeNewsletterForm();
    this.initializeScrollAnimations();
  }

  // Initialize footer elements
  private initializeFooter(): void {
    // Add smooth scroll behavior for anchor links
    const anchorLinks = this.el.nativeElement.querySelectorAll('a[href^="#"]');
    anchorLinks.forEach((link: HTMLElement) => {
      link.addEventListener('click', (e: Event) => {
        e.preventDefault();
        const targetId = (link as HTMLAnchorElement).getAttribute('href');
        if (targetId && targetId !== '#') {
          const targetElement = document.querySelector(targetId);
          if (targetElement) {
            targetElement.scrollIntoView({
              behavior: 'smooth',
              block: 'start'
            });
          }
        }
      });
    });
  }

  // Set current year in copyright
  private setCurrentYear(): void {
    const yearElement = this.el.nativeElement.querySelector('#currentYear');
    if (yearElement) {
      yearElement.textContent = new Date().getFullYear().toString();
    }
  }

  // Initialize newsletter form
  private initializeNewsletterForm(): void {
    const form = this.el.nativeElement.querySelector('.footer-newsletter-form');
    if (form) {
      form.addEventListener('submit', (e: Event) => {
        e.preventDefault();
        this.onNewsletterSubmit(e);
      });
    }

    // Add input animations
    const input = this.el.nativeElement.querySelector('.newsletter-input');
    if (input) {
      input.addEventListener('focus', () => {
        this.onNewsletterInputFocus(input, true);
      });
      
      input.addEventListener('blur', () => {
        this.onNewsletterInputFocus(input, false);
      });
    }
  }

  // Handle newsletter submission
  private onNewsletterSubmit(event: Event): void {
    const form = event.target as HTMLFormElement;
    const input = form.querySelector('.newsletter-input') as HTMLInputElement;
    const button = form.querySelector('.newsletter-btn') as HTMLButtonElement;
    const email = input.value.trim();

    if (!email) return;

    // Add loading state
    const originalIcon = button.innerHTML;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    button.disabled = true;

    // Simulate API call
    setTimeout(() => {
      // Show success message
      this.showNewsletterSuccess(form, email);
      
      // Reset form
      input.value = '';
      button.innerHTML = originalIcon;
      button.disabled = false;
    }, 2000);
  }

  // Handle input focus effects
  private onNewsletterInputFocus(input: HTMLElement, isFocused: boolean): void {
    const inputGroup = input.closest('.newsletter-input-group') as HTMLElement;
    const icon = inputGroup?.querySelector('.input-icon i') as HTMLElement;
    
    if (isFocused) {
      if (icon) {
        icon.style.color = '#7ED957';
        icon.style.transform = 'scale(1.1)';
      }
    } else {
      if (icon) {
        icon.style.color = '';
        icon.style.transform = '';
      }
    }
  }

  // Show newsletter success message
  private showNewsletterSuccess(form: HTMLElement, email: string): void {
    // Create success notification
    const notification = document.createElement('div');
    notification.className = 'newsletter-success-notification';
    notification.innerHTML = `
      <div class="success-content">
        <i class="fas fa-check-circle"></i>
        <div class="success-text">
          <strong>Inscription réussie!</strong>
          <span>Vérifiez votre boîte mail: ${email}</span>
        </div>
      </div>
    `;
    
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
      padding: 15px 20px;
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(16, 185, 129, 0.3);
      z-index: 10000;
      animation: notificationSlide 0.5s ease-out;
      max-width: 350px;
    `;

    document.body.appendChild(notification);

    // Auto remove after 5 seconds
    setTimeout(() => {
      notification.style.animation = 'notificationSlideOut 0.5s ease-out forwards';
      setTimeout(() => {
        notification.remove();
      }, 500);
    }, 5000);
  }

  // Initialize scroll animations
  private initializeScrollAnimations(): void {
    const observerOptions = {
      threshold: 0.2,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const element = entry.target as HTMLElement;
          element.classList.add('footer-animate-in');
          observer.unobserve(element);
        }
      });
    }, observerOptions);

    // Observe footer sections
    const footerSections = this.el.nativeElement.querySelectorAll('.footer-section, .footer-brand');
    footerSections.forEach((section: HTMLElement) => {
      observer.observe(section);
    });
  }
}
