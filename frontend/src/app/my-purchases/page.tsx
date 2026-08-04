"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { ShoppingBag, ArrowLeft } from "lucide-react";

function MyPurchasesContent() {
  return (
    <main className="w-full max-w-7xl mx-auto px-6 pt-12 pb-20 flex-1">
      <div className="w-full mb-10 text-center md:text-left max-w-3xl">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground mb-4 text-balance">
          {"Mua hàng của tôi"}
        </h1>
        <p className="text-muted-foreground text-lg leading-relaxed">
          {"Quản lý đơn hàng, lịch sử thanh toán và hóa đơn giao dịch của bạn."}
        </p>
      </div>

      <div className="bg-card border border-border rounded-3xl p-12 text-center max-w-2xl mx-auto shadow-sm">
        <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-5">
          <ShoppingBag className="w-8 h-8" aria-hidden="true" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">{"Chưa có đơn hàng nào"}</h2>
        <p className="text-sm text-muted-foreground mb-8 max-w-md mx-auto leading-relaxed">
          {
            "Trang lịch sử mua hàng đang được phát triển. Tất cả hóa đơn và giao dịch khóa học của bạn sẽ hiển thị tại đây."
          }
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/my-learning"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border bg-card hover:bg-muted text-foreground text-sm font-semibold transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span>{"Việc học của tôi"}</span>
          </Link>
          <Link
            href="/courses"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground text-sm font-semibold transition-colors cursor-pointer"
          >
            {"Khám phá khóa học"}
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function MyPurchasesPage() {
  return (
    <Suspense
      fallback={
        <main className="w-full max-w-7xl mx-auto px-6 pt-12 pb-20 flex-1">
          <div className="bg-card border border-border rounded-3xl p-12 text-center max-w-2xl mx-auto animate-pulse h-64" />
        </main>
      }
    >
      <MyPurchasesContent />
    </Suspense>
  );
}
