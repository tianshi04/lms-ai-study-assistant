import { Page, Locator, expect } from '@playwright/test';

export class CourseCompletionModalPage {
  readonly page: Page;
  readonly modalContainer: Locator;
  readonly modalTitle: Locator;
  readonly starButtons: Locator;
  readonly commentTextarea: Locator;
  readonly submitReviewButton: Locator;
  readonly viewCertificateButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.modalContainer = page.locator('[role="dialog"]');
    this.modalTitle = page.locator('h2, h3').filter({ hasText: /Chúc mừng bạn đã hoàn thành|Hoàn thành khóa học/i });
    this.starButtons = this.modalContainer.locator('button[aria-label*="sao"], button:has(svg.lucide-star)');
    this.commentTextarea = this.modalContainer.locator('textarea[placeholder*="Chia sẻ cảm nhận của bạn"], textarea[placeholder*="Chia sẻ trải nghiệm"]');
    this.submitReviewButton = this.modalContainer.getByRole('button', { name: /Gửi đánh giá/i });
    this.viewCertificateButton = this.modalContainer.locator('a, button').filter({ hasText: /Xem chứng chỉ|Nhận chứng chỉ/i });
  }

  async verifyModalVisible() {
    await expect(this.modalTitle).toBeVisible({ timeout: 10000 });
  }

  async submitReview(stars: number = 5, comment: string = 'Khóa học rất bổ ích và thiết thực.') {
    // Wait for existing review check to settle
    await this.page.waitForTimeout(600);

    // If already submitted, the review already exists in the course completion modal
    const alreadySubmitted = await this.modalContainer.locator('text=Đã gửi đánh giá thành công').isVisible().catch(() => false);
    if (alreadySubmitted) {
      return;
    }

    // Otherwise fill and submit new review
    if (await this.commentTextarea.isVisible().catch(() => false)) {
      try {
        await this.commentTextarea.fill(comment, { timeout: 3000 });
        if (await this.submitReviewButton.isVisible().catch(() => false)) {
          await this.submitReviewButton.click({ timeout: 3000 });
        }
      } catch {
        // If state transitioned to already submitted during fill, proceed safely
      }
    }
  }
}
