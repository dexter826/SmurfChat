// Đăng ký service worker để hỗ trợ khả năng offline và tải nhanh hơn.
// Xem: https://bit.ly/CRA-PWA để biết chi tiết.

const isLocalhost = Boolean(
    window.location.hostname === 'localhost' ||
    window.location.hostname === '[::1]' ||
    window.location.hostname.match(
        /^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/
    )
);

export function register(config) {
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
        const publicUrl = new URL(process.env.PUBLIC_URL, window.location.href);
        if (publicUrl.origin !== window.location.origin) {
            return;
        }

        window.addEventListener('load', () => {
            const swUrl = `${process.env.PUBLIC_URL}/service-worker.js`;

            if (isLocalhost) {
                // Kiểm tra xem service worker có tồn tại trên localhost không.
                checkValidServiceWorker(swUrl, config);

                navigator.serviceWorker.ready.then(() => {
                    console.log(
                        'Ứng dụng được phục vụ cache-first bởi service worker. Xem https://bit.ly/CRA-PWA'
                    );
                });
            } else {
                // Đăng ký service worker cho production.
                registerValidSW(swUrl, config);
            }
        });
    }
}

function registerValidSW(swUrl, config) {
    navigator.serviceWorker
        .register(swUrl)
        .then((registration) => {
            registration.onupdatefound = () => {
                const installingWorker = registration.installing;
                if (installingWorker == null) {
                    return;
                }
                installingWorker.onstatechange = () => {
                    if (installingWorker.state === 'installed') {
                        if (navigator.serviceWorker.controller) {
                            // Nội dung mới có sẵn sau khi tất cả các tab được đóng.
                            console.log(
                                'Nội dung mới có sẵn và sẽ được sử dụng khi tất cả các tab được đóng. Xem https://bit.ly/CRA-PWA.'
                            );
                            if (config && config.onUpdate) {
                                config.onUpdate(registration);
                            }
                        } else {
                            // Nội dung được lưu cache để sử dụng offline.
                            console.log('Nội dung được lưu cache để sử dụng offline.');
                            if (config && config.onSuccess) {
                                config.onSuccess(registration);
                            }
                        }
                    }
                };
            };
        })
        .catch((error) => {
            console.error('Lỗi trong quá trình đăng ký service worker:', error);
        });
}

function checkValidServiceWorker(swUrl, config) {
    // Kiểm tra xem service worker có tồn tại không. Tải lại nếu không tìm thấy.
    fetch(swUrl, {
        headers: { 'Service-Worker': 'script' },
    })
        .then((response) => {
            const contentType = response.headers.get('content-type');
            if (
                response.status === 404 ||
                (contentType != null && contentType.indexOf('javascript') === -1)
            ) {
                navigator.serviceWorker.ready.then((registration) => {
                    registration.unregister().then(() => {
                        window.location.reload();
                    });
                });
            } else {
                registerValidSW(swUrl, config);
            }
        })
        .catch(() => {
            console.log('Không tìm thấy kết nối internet. Ứng dụng đang chạy ở chế độ offline.');
        });
}

export function unregister() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready
            .then((registration) => {
                registration.unregister();
            })
            .catch((error) => {
                console.error(error.message);
            });
    }
}
