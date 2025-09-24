import React, { useEffect, useState } from "react";
import Lottie from "lottie-react";
import animationData from "../../assets/message-animation.json";

/**
 * SplashScreen Component
 *
 * Hiển thị màn hình splash với animation Lottie và tên ứng dụng
 */
const SplashScreen = ({ onComplete }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Tự động ẩn splash screen sau 3 giây
    const timer = setTimeout(() => {
      setIsVisible(false);
      if (onComplete) {
        onComplete();
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800">
      {/* Lottie Animation */}
      <div className="w-64 h-64 mb-8">
        <Lottie
          animationData={animationData}
          loop={true}
          autoplay={true}
          style={{ width: "100%", height: "100%" }}
        />
      </div>

      {/* App Name */}
      <div className="text-center transform -translate-y-20">
        <h1 className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">
          SmurfChat
        </h1>
        <p className="text-gray-600 dark:text-gray-300 text-sm">
          Kết nối mọi người, mọi lúc
        </p>
      </div>
    </div>
  );
};

export default SplashScreen;
