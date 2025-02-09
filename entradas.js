


(async function initializeTMDB() {
    // Configuration and Constants
    const CONFIG = {
        API_KEY: 'c2a30192cfbf4e95acbb656bf3af6177',
        BASE_URL: 'https://api.themoviedb.org/3',
        IMG_BASE_URL: 'https://image.tmdb.org/t/p/original',
        PROFILE_IMG_BASE: 'https://image.tmdb.org/t/p/w200',
        DEFAULT_PROFILE: 'https://as1.ftcdn.net/jpg/02/68/55/60/220_F_268556012_c1WBaKFN5rjRxR2eyV33znK4qnYeKZjm.jpg',
        LANGUAGES: ['es-MX', 'es-ES', 'en'],
        IMAGE_BASE_URL: 'https://image.tmdb.org/t/p/w500',
        DEFAULT_BACKDROP: 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgAS7J14SG4p9GnCtGK6VcqYCvTzpPNpjAnP7LJjYD4ne2VVjaLc-gkUuFql8c3kZLzP4VcoYWlxYAXq8jSTv4D5dQRgPo_PLZZmw9wdySlYDaYGDUDv5v8ISK6cl-i6JI-OGwCC-F8qscg1Zu4BouHChVAtgDoGQ2bECY2grlIgn2Bd9Nq3o8V6x-8QG7e/s1600/network_error.png'
    };

    // Cache for storing results
    const cache = new Map();
    let currentUrl = '';
    let seriesBackdropUrl = '';

    class TMDBDetailsExtractor {
        constructor(tmdbUrl, targetSelector) {
            const urlInfo = this.extractUrlInfo(tmdbUrl);
        this.contentId = urlInfo.id;
        this.contentType = urlInfo.type;
        this.targetSelector = targetSelector;
        
        // Crear custom-info inmediatamente en el constructor
        this.customInfo = document.createElement('div');
        this.customInfo.className = 'custom-info';
        this.customInfo.id = 'forced-custom-info';
        this.customInfo.style.cssText = 'display: block !important; visibility: visible !important; opacity: 1 !important;';
        
        this.showLoadingState();

        }

        extractUrlInfo(url) {
            const movieMatch = url.match(/\/movie\/(\d+)/);
            const tvMatch = url.match(/\/tv\/(\d+)/);
            
            if (movieMatch) return { type: 'movie', id: movieMatch[1] };
            if (tvMatch) return { type: 'tv', id: tvMatch[1] };
            throw new Error('URL no válida');
        }

        async fetchCleanImages() {
            const cacheKey = `images-${this.contentType}-${this.contentId}`;
            if (cache.has(cacheKey)) return cache.get(cacheKey);

            try {
                const url = `${CONFIG.BASE_URL}/${this.contentType}/${this.contentId}/images?api_key=${CONFIG.API_KEY}`;
                const response = await fetch(url);
                const data = await response.json();
                
                const images = {
                    poster: null,
                    backdrop: null
                };

                if (data.posters?.length > 0) {
                    const cleanPoster = data.posters.find(poster => 
                        !poster.iso_639_1 || poster.iso_639_1 === 'xx'
                    ) || data.posters[0];
                    images.poster = `${CONFIG.IMG_BASE_URL}${cleanPoster.file_path}`;
                }

                if (data.backdrops?.length > 0) {
                    const cleanBackdrop = data.backdrops.find(backdrop => 
                        !backdrop.iso_639_1 || backdrop.iso_639_1 === 'xx'
                    ) || data.backdrops[0];
                    images.backdrop = `${CONFIG.IMG_BASE_URL}${cleanBackdrop.file_path}`;
                }

                cache.set(cacheKey, images);
                return images;
            } catch (error) {
                console.error('Error fetching clean images:', error);
                return null;
            }
        }

        showLoadingState() {
            const container = document.createElement('div');
            container.className = 'content-container loading';
            container.innerHTML = `
                <div class="content-backdrop skeleton"></div>
                <div class="content-info">
                    <div class="skeleton-text"></div>
                    <div class="skeleton-text"></div>
                    <div class="cast-grid skeleton">
                        ${Array(5).fill('<div class="cast-member-skeleton"></div>').join('')}
                    </div>
                </div>
            `;
            this.insertBeforeElement(container, this.targetSelector);
        }

        async fetchDetails() {
            try {
                const cacheKey = `${this.contentType}-${this.contentId}`;
                if (cache.has(cacheKey)) {
                    const cachedData = cache.get(cacheKey);
                    this.createContentDiv(cachedData.content, cachedData.credits, cachedData.images);
                    return;
                }

                const [contentData, creditsData, cleanImages] = await Promise.all([
                    fetch(`${CONFIG.BASE_URL}/${this.contentType}/${this.contentId}?api_key=${CONFIG.API_KEY}&language=es-ES`)
                        .then(res => res.json()),
                    fetch(`${CONFIG.BASE_URL}/${this.contentType}/${this.contentId}/credits?api_key=${CONFIG.API_KEY}`)
                        .then(res => res.json()),
                    this.fetchCleanImages()
                ]);

                cache.set(cacheKey, {
                    content: contentData,
                    credits: creditsData,
                    images: cleanImages
                });

                this.preloadImages(cleanImages, creditsData);
                document.querySelector('.content-container.loading')?.remove();
                this.createContentDiv(contentData, creditsData, cleanImages);
            } catch (error) {
                console.error('Error al obtener datos:', error);
                this.showErrorState();
            }
        }

        preloadImages(images, credits) {
            if (images.backdrop) new Image().src = images.backdrop;
            if (images.poster) new Image().src = images.poster;

            credits.cast.slice(0, 15).forEach(actor => {
                if (actor.profile_path) {
                    new Image().src = `${CONFIG.PROFILE_IMG_BASE}${actor.profile_path}`;
                }
            });
        }

        showErrorState() {
            const container = document.querySelector('.content-container.loading');
            if (container) {
                container.innerHTML = `
                    <div class="error-state">
                        <p>Error al cargar los datos. Por favor, intenta de nuevo.</p>
                    </div>
                    <style>
                        .caph2 { display: none !important; }
                        .capitulo { display: none !important; }
                        .error-state {
                            position: absolute;
                            width: -webkit-fill-available;
                            height: -webkit-fill-available;
                            left: 0;
                            top: 0;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            font-size: 20px;
                            padding: 15px;
                            text-align: center;
                        }
                    </style>
                `;
            }
        }

        insertBeforeElement(newElement, targetSelector) {
            const targetElement = document.querySelector(targetSelector);
            if (targetElement) {
                targetElement.parentNode.insertBefore(newElement, targetElement);
            } else {
                console.error(`Elemento con selector "${targetSelector}" no encontrado`);
                document.body.appendChild(newElement);
            }
        }

        createContentDiv(content, credits, images) {
        // Limpiar contenedores existentes
        document.querySelectorAll('.content-container').forEach(el => el.remove());
        
        const container = document.createElement('div');
        container.className = 'content-container';
        
        const title = this.contentType === 'movie' ? content.title : content.name;

        // Crear el contenido base
        const baseHTML = `
            <div class="content-backdrop-wrapper">
                <div class="content-backdrop parallax">
                    <picture>
                        <source media="(max-width: 768px)" srcset="${images?.poster || `${CONFIG.IMG_BASE_URL}${content.poster_path}`}" />
                        <img src="${images?.backdrop || `${CONFIG.IMG_BASE_URL}${content.backdrop_path}`}" alt="${title}">
                    </picture>
                    <h1 class="titles">${title}</h1>
                </div>
            </div>
            <div class="content-info">
                <div class="content-overview">
                    <h2>Sinopsis</h2>
                    <p>${content.overview || 'No hay sinopsis disponible.'}</p>
                </div>
                <div class="content-cast">
                    <h2>Reparto Principal</h2>
                    <div class="cast-grid">
                        ${credits.cast.slice(0, 15).map(actor => `
                            <div class="cast-member">
                                <img loading="lazy" onerror="this.onerror=null; this.src='${CONFIG.DEFAULT_PROFILE}';" 
                                     src="${actor.profile_path ? CONFIG.PROFILE_IMG_BASE + actor.profile_path : CONFIG.DEFAULT_PROFILE}" 
                                     alt="${actor.name}">
                                <h3>${actor.name}</h3>
                                <p>${actor.character}</p>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div id="custom-info-container"></div>
            </div>`;

        container.innerHTML = baseHTML;

        // Forzar la inserción del custom-info
        const customInfoContainer = container.querySelector('#custom-info-container');
        if (customInfoContainer) {
            // Clonar el custom-info existente para evitar referencias
            const newCustomInfo = this.customInfo.cloneNode(true);
            customInfoContainer.parentNode.replaceChild(newCustomInfo, customInfoContainer);
        }

        // Insertar el contenedor en el DOM
        this.insertBeforeElement(container, this.targetSelector);

        // Verificar y reinsertar si es necesario
        const forceCustomInfo = () => {
            const contentInfo = document.querySelector('.content-info');
            const existingCustomInfo = document.querySelector('.custom-info');
            
            if (!existingCustomInfo && contentInfo) {
                console.log('Forzando creación de custom-info');
                const newCustomInfo = this.customInfo.cloneNode(true);
                contentInfo.appendChild(newCustomInfo);
            }
        };

        // Múltiples intentos de verificación
        forceCustomInfo();
        setTimeout(forceCustomInfo, 100);
        setTimeout(forceCustomInfo, 500);
        setTimeout(forceCustomInfo, 1000);

        // Agregar observer para monitorear cambios
        const observer = new MutationObserver((mutations) => {
            const customInfo = document.querySelector('.custom-info');
            if (!customInfo) {
                forceCustomInfo();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // Agregar estilos forzados
        if (!document.getElementById('forced-custom-info-styles')) {
            const styles = document.createElement('style');
            styles.id = 'forced-custom-info-styles';
            styles.textContent = `
                .custom-info {
                    display: block !important;
                    visibility: visible !important;
                    opacity: 1 !important;
                    position: relative !important;
                    z-index: 10 !important;
                    min-height: 20px !important;
                    margin-bottom: 17px !important;
                    background: var(--background-color);
                }
                .content-info {
                    position: relative !important;
                    z-index: 1 !important;
                }
            `;
            document.head.appendChild(styles);
        }

        this.setupParallaxEffect(container);
        this.addStyles();
    }



        setupParallaxEffect(container) {
            const parallaxElement = container.querySelector('.parallax picture');
            let lastScrollPosition = window.pageYOffset;
            let animationFrameId = null;
            let lastTime = 0;
            const throttleInterval = 10;

            const updateParallax = () => {
                const scrolled = window.pageYOffset;
                const rate = scrolled * 0.3;
                
                if (parallaxElement) {
                    parallaxElement.style.transform = `translate3d(0, ${rate}px, 0)`;
                }
                
                lastScrollPosition = scrolled;
                animationFrameId = null;
            };

            window.addEventListener('scroll', () => {
                const now = Date.now();
                
                if (now - lastTime >= throttleInterval) {
                    if (!animationFrameId) {
                        animationFrameId = requestAnimationFrame(updateParallax);
                    }
                    lastTime = now;
                }
            }, { passive: true });

            let resizeTimeout;
            window.addEventListener('resize', () => {
                clearTimeout(resizeTimeout);
                resizeTimeout = setTimeout(() => {
                    if (parallaxElement) {
                        parallaxElement.style.transform = `translate3d(0, ${window.pageYOffset * 0.3}px, 0)`;
                    }
                }, 100);
            }, { passive: true });
        }

        addStyles() {
            if (!document.querySelector('#tmdb-styles')) {
                const styles = document.createElement('style');
                styles.id = 'tmdb-styles';
                styles.textContent = `
                    .content-container {
                        margin: 0 auto;
                        padding: 0;
                        font-family: Arial, sans-serif;
                    }

                    .content-backdrop-wrapper {
                        position: relative;
                        height: 400px;
                        overflow: hidden;
                        will-change: transform;
                        transform: translateZ(0);
                        backface-visibility: hidden;
                        perspective: 1000px;
                    }

                    .content-backdrop {
                        position: relative;
                        height: 400px;
                        will-change: transform;
                        transform: translateZ(0);
                        backface-visibility: hidden;
                    }

                    .content-backdrop picture {
                        width: 100%;
                        height: 120%;
                        display: block;
                        position: absolute;
                        top: 0;
                        will-change: transform;
                        transform: translateZ(0);
                        backface-visibility: hidden;
                    }

                    .content-backdrop img {
                        width: 100%;
                        height: 120%;
                        object-fit: cover;
                        object-position: center;
                        will-change: transform;
                        transform: translateZ(0);
                        backface-visibility: hidden;
                    }

                    .titles {
                        position: absolute;
                        bottom: 0;
                        left: 0;
                        width: -webkit-fill-available;
                        padding: 15px;
                        background-image: linear-gradient(0deg, var(--background-color), rgb(0 0 0 / 50%), transparent);
                        margin: 0;
                        font-size: 40px;
                        color: #fff;
                        height: -webkit-fill-available;
                        display: flex;
                        align-items: flex-end;
                        justify-content: flex-start;
                    }

                    .mobile-only { display: none; }

                    .content-info {
                        padding: 15px;
                        padding-top: 0;
                    }

                    .content-overview h2 {
                        font-size: 1.3em;
                        margin-bottom: 15px;
                    }

                    .content-overview p {
                        color: var(--text-secondary);
                        line-height: 1.5;
                        margin-bottom: 20px;
                        overflow: hidden;
                        display: -webkit-box;
                        -webkit-line-clamp: 4;
                        -webkit-box-orient: vertical;
                    }

                    .content-cast h2 {
                        margin-bottom: 15px;
                        font-size: 1.3em;
                    }

                    .cast-grid {
                        display: flex;
                        overflow-x: auto;
                        padding-bottom: 15px;
                        -webkit-overflow-scrolling: touch;
                        gap: 15px;
                        scrollbar-width: thin;
                    }

                    .cast-member {
                        flex: 0 0 auto;
                        text-align: center;
                        width: 120px;
                    }

                    .cast-member img {
                        width: 120px;
                        height: 180px;
                        object-fit: cover;
                        border-radius: 8px;
                    }

                    .cast-member h3 {
                        margin: 8px 0 4px 0;
                        font-size: 14px;
                        white-space: nowrap;
                        text-overflow: ellipsis;
                    }

                    .cast-member p {
                        margin: 0;
                        font-size: 12px;
                        color: var(--text-secondary);
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                    }

                    @media (max-width: 768px) {
                        .content-backdrop-wrapper {
                            height: auto;
                            aspect-ratio: 2 / 3;
                            max-height: 60vh;
                            width: -webkit-fill-available;
                        }

                        .content-backdrop {
                            height: 100%;
                        }

                        .content-backdrop picture {
                            height: 120%;
                        }

                        .content-backdrop img {
                            height: 120%;
                        }

                        .desktop-only { display: none; }
                        .mobile-only { display: block; }
                    }

                    .loading .skeleton {
                        background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
                        background-size: 200% 100%;
                        animation: loading 1.5s infinite;
                    }

                    .content-backdrop.skeleton {
                        height: 250px;
                        border-radius: 8px;
                    }

                    .skeleton-text {
                        height: 20px;
                        margin: 10px 0;
                        border-radius: 4px;
                    }

                    .cast-member-skeleton {
                        width: 120px;
                        height: 180px;
                        border-radius: 8px;
                        background: var(--accent-light);
                    }

                    @keyframes loading {
                        0% { background-position: 200% 0; }
                        100% { background-position: -200% 0; }
                    }
                `;
                document.head.appendChild(styles);
            }
        }
    }

    // Utility functions for episode handling
    const fetchWithTimeout = async (url, timeout = 5000) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        try {
            const response = await fetch(url, { signal: controller.signal });
            const data = await response.json();
            return data;
        } finally {
            clearTimeout(timeoutId);
        }
    };

    const fetchTMDBData = (endpoint, language) => 
        fetchWithTimeout(`${CONFIG.BASE_URL}/${endpoint}?api_key=${CONFIG.API_KEY}&language=${language}`);

    const getImageUrl = (path) => path ? `${CONFIG.IMAGE_BASE_URL}${path}` : CONFIG.DEFAULT_BACKDROP;

    // Process episode data
    const processEpisodeData = (episodeResponses, episodeNumber) => {
        const episodes = episodeResponses.map(response => response?.episodes?.[episodeNumber - 1]).filter(Boolean);
        if (!episodes.length) return null;

        const isDefaultTitle = (title) => {
            if (!title) return true;
            const cleanTitle = title.toLowerCase().trim();
            return cleanTitle === `episodio ${episodeNumber}` || cleanTitle === `episode ${episodeNumber}`;
        };

        const findValidContent = (property) => 
            episodes.find(episode => episode[property] && (!property.includes('name') || !isDefaultTitle(episode[property])))?.[property];

        return {
            title: findValidContent('name') ? `Episodio ${episodeNumber}: ${findValidContent('name')}` : `Episodio ${episodeNumber}`,
            overview: findValidContent('overview') || 'Sinopsis no disponible',
            imageUrl: getImageUrl(findValidContent('still_path') || seriesBackdropUrl),
            airDate: findValidContent('air_date') || 'Fecha no disponible',
            number: episodeNumber
        };
    };

    // Create dialog
    const createDialog = () => {
        const dialog = document.createElement('dialog');
        dialog.id = 'playDialog';
        dialog.style.cssText = `
            padding: 20px;
            border-radius: 8px;
            background: var(--modal-bg);
            width: -webkit-fill-available;
            height: -webkit-fill-available;
            max-width: none;
            max-height: none;
        `;
        
        dialog.innerHTML = `
            <div style="text-align: center; height: -webkit-fill-available; width: -webkit-fill-available; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                <div style="padding: 15px; background: var(--card-background); border-radius: 8px; max-width: 300px;">
                    <h3 style="margin-bottom: 20px;color: #fff;">¿Cómo deseas reproducir este contenido?</h3>
                    <div style="display: flex; flex-direction: column; gap: 10px;">
                        <button id="openWVC" style="padding: 10px 20px; background: var(--accent-color); color: white; border: none; border-radius: 4px;">
                            Abrir en WVC
                        </button>
                        <button id="openBrave" style="padding: 10px 20px; background: var(--accent-color); color: white; border: none; border-radius: 4px;">
                            Abrir en Brave
                        </button>
                        <button id="closeDialog" style="padding: 10px 20px; background: var(--accent-light); color: white; border: none; border-radius: 4px;">
                            Cancelar
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
        return dialog;
    };

    // Initialize episodes
    const initializeEpisodes = async () => {
        const contentDivs = document.querySelectorAll('.content a');
        
        for (const contentDiv of contentDivs) {
            const movieUrl = contentDiv.getAttribute('href');
            if (!movieUrl?.includes('/tv/')) continue;

            const movieId = movieUrl.match(/\/tv\/(\d+)/)?.[1];
            if (!movieId) continue;

            try {
                const seriesData = await fetchTMDBData(`tv/${movieId}`, 'en');
                seriesBackdropUrl = getImageUrl(seriesData.backdrop_path);
                
                const seasonContainers = document.querySelectorAll('[id^="T"]');
                
                for (const container of seasonContainers) {
                    const seasonNumber = parseInt(container.id.replace('T', ''));
                    const episodes = container.querySelectorAll('.weewwe');
                    
                    try {
                        const seasonResponses = await Promise.all(
                            CONFIG.LANGUAGES.map(lang => fetchTMDBData(`tv/${movieId}/season/${seasonNumber}`, lang))
                        );

                        episodes.forEach((episode, index) => {
                            const episodeNumber = index + 1;
                            const clickElement = episode.querySelector('.click.capt');
                            if (!clickElement) return;

                            const originalUrl = clickElement.getAttribute('onclick')?.match(/document\.getElementById\('zvxcvxcv'\)\.src\s*=\s*'([^']+)'/)?.[1];
                            if (!originalUrl) return;

                            const episodeData = processEpisodeData(seasonResponses, episodeNumber);
                            if (!episodeData) return;

                            const movieBackground = document.createElement('div');
                            movieBackground.className = 'movie-background';
                            movieBackground.innerHTML = `
                                <div class="infocap">
                                    <a style="position: relative;">
                                        <div class="playCap" data-url="${originalUrl.replace(/^https?:\/\//, '')}">
                                            <i class="bi bi-play-fill"></i>
                                        </div>
                                        <img src="${episodeData.imageUrl}" alt="Imagen del episodio ${episodeData.number}">
                                    </a>
                                    <div class="titlecap">
                                        <h3>${episodeData.title}</h3>
                                        <p>${episodeData.airDate}</p>
                                    </div>
                                </div>
                                <p>${episodeData.overview}</p>
                            `;

                            const playButton = movieBackground.querySelector('.playCap');
                            if (playButton) {
                                playButton.addEventListener('click', (e) => {
                                    e.preventDefault();
                                    currentUrl = playButton.dataset.url;
                                    const dialog = document.getElementById('playDialog');
                                    dialog.showModal();
                                    document.body.style.overflow = 'hidden';
                                });
                            }

                            episode.appendChild(movieBackground);
                        });
                    } catch (error) {
                        console.error(`Error processing season ${seasonNumber}:`, error);
                    }
                }
            } catch (error) {
                console.error('Error processing series:', error);
            }
        }
    };

    // Initialize everything when DOM is loaded
    document.addEventListener("DOMContentLoaded", async function() {
        const dialog = createDialog();
        
        // Dialog event handlers
        document.getElementById('closeDialog')?.addEventListener('click', () => {
            dialog.close();
            document.body.style.overflow = '';
        });
        
        document.getElementById('openWVC')?.addEventListener('click', () => {
            if (currentUrl) {
                location.href = `intent://${currentUrl}#Intent;scheme=https;package=com.instantbits.cast.webvideo;S.secure_uri=true;end;`;
            }
            dialog.close();
            document.body.style.overflow = '';
        });
        
        document.getElementById('openBrave')?.addEventListener('click', () => {
            if (currentUrl) {
                location.href = `intent://${currentUrl}#Intent;scheme=https;package=com.brave.browser;end;`;
            }
            dialog.close();
            document.body.style.overflow = '';
        });

        // Initialize click handlers for existing elements
        document.querySelectorAll('.click, .btn-warning').forEach(element => {
            const urlMatch = element.getAttribute('onclick')?.match(/document\.getElementById\('zvxcvxcv'\)\.src\s*=\s*'([^']+)'/);
            if (urlMatch?.[1]) {
                const cleanUrl = urlMatch[1].replace(/^https?:\/\//, '');
                element.addEventListener('click', (e) => {
                    e.preventDefault();
                    currentUrl = cleanUrl;
                    dialog.showModal();
                });
            }
        });

        // Initialize TMDB extractor
        const linkElement = document.querySelector([
            '.mobile_header.content a',
            '.mobile_header.large .content a',
            '.mobile_header.small .content a',
            '.mobile_header.medium .content a',
            '.mobile_header.short .content a'
        ].join(','));

        if (linkElement) {
            const tmdbUrl = linkElement.href;
            const targetSelector = 'erwrfwe';
            const extractor = new TMDBDetailsExtractor(tmdbUrl, targetSelector);
            await extractor.fetchDetails();
        }

        // Initialize episodes
        await initializeEpisodes();
    });
})();


