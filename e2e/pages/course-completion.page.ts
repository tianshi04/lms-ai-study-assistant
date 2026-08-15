import { Page, Locator, expect } from '@playwright/test';

export class CourseCompletionModalPage {
  readonly page: Page;
  readonly modalTitle: Locator;
  readonly starButtons: Locator;
  readonly commentTextarea: Locator;
  readonly submitReviewButton: Locator;
  readonly viewCertificateButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.modalTitle = page.locator('h2, h3').filter({ hasText: /Chúc mừng bạn đã hoàn thành|Hoàn thành khóa học/i });
    this.starButtons = page.locator('button[aria-label*="sao"], button:has(svg.lucide-star)');
    this.commentTextarea = page.locator('textarea[placeholder*="Chia sẻ cảm nhận của bạn"]');
    this.submitReviewButton = page.getByRole('button', { name: /Gửi đánh giá/i });
    this.viewCertificateButton = page.locator('a, button').filter({ hasText: /Xem chứng chỉ|Nhận chứng chỉ/i });
  }

  async verifyModalVisible() {
    await expect(this.modalTitle).toBeVisible({ timeout: 10000 });
  }

  async submitReview(stars: number = 5, comment: string = 'Khóa học rất bổ ích và thiết thực.') {
    if (await this.commentTextarea.isVisible()) {
      await this.commentTextarea.fill(comment);
      await this.submitReviewButton.click();
    }
  }
}
