/**
 * 4 types of refresh
 *
 * @return {undefined}
 */


;(function($){

    /* Known issue: 
     * 1.iOS feature when scrolling ,animation will stop  
     * 2. Animation display issue in anfroid like miui小米
     */

    /**
     * TODO list:
     * * custom position
     * * theme extract
     *
     */

    // DOM
    var $scrollEl = $(document.body);

    var $refreshMain, $spinnerWrapper, $arrowWrapper, $arrowMain;

    var scrollEl = document.body;

    var noShowClass = 'mui-refresh-noshow';

    var isShowLoading = false;
    var isStoping = false;

    var NUM_POS_START_Y = -70;
    var NUM_POS_TARGET_Y = 0;
    var NUM_POS_MAX_Y = 65;
    var NUM_POS_MIN_Y = -25;
    var basePosY = 0;

    var touchCurrentY;
    var touchStartY = 0;
    var verticalThreshold = 2;
    var maxRotateTime = 3000;

    var onBegin = null;
    var onEnd = null;
    var stopAnimatTimeout = null;
    var lastTime = new Date().getTime();

    var refreshType = 2;

    var isIOS = $.os.ios;

    var tmpl = '<div id="muiRefresh" class="mui-refresh-main mui-blue-theme">\
        <div class="mui-refresh-wrapper ">\
            <div class="mui-arrow-wrapper">\
                <div class="mui-arrow-main"></div>\
            </div>\
            <div class="mui-spinner-wrapper" style="display:none;">\
                <div class="mui-spinner-main" >\
                    <div class="mui-spinner-left">\
                        <div class="mui-half-circle"></div>\
                    </div>\
                    <div class="mui-spinner-right">\
                        <div class="mui-half-circle"></div>\
                    </div>\
                </div>\
            </div>\
        </div>\
    </div>';

    var touchPos = {
        top: 0,
        x1: 0,
        x2: 0
    }



    /* var opts = { */
    /*     scrollEl: null, */
    /*     maxRotateTime: 3000, */
    /*     onRotateBegin: null, */
    /*     onRotateEnd: null */

        
    /* } */


    function mRefresh(options) {
        options = options || {};

        scrollEl = options.scrollEl ? options.scrollEl :
                        isIOS ? scrollEl : document;
        $scrollEl = $(scrollEl);

        // extend options
        onBegin = options.onRotateBegin;
        onEnd = options.onRotateEnd;
        maxRotateTime = options.maxRotateTime || maxRotateTime;
        refreshType = options.type || refreshType;

        if($('#muiRefresh').length === 0){
            renderTmpl();

            $refreshMain = $('#muiRefresh');
            $spinnerWrapper = $('.mui-spinner-wrapper', $refreshMain);
            $arrowWrapper = $('.mui-arrow-wrapper', $refreshMain);
            $arrowMain = $('.mui-arrow-main', $refreshMain);

        }

        // Different types config
        if (refreshType == 2) {
            $refreshMain.addClass('mui-refresh-type' + refreshType);
            basePosY = 60;
        }

        bindEvents();

    }

    // Finish loading
    mRefresh.resolve = function() {
        if(!isStoping && stopAnimatTimeout){
            clearTimeout(stopAnimatTimeout);
            stopAnimatTimeout = null;

            recoverRefresh();
        }
    }

    mRefresh.destroy = function(){
        unbindEvents();
        $('#muiRefresh').remove();

    }
    
    function renderTmpl(){
        document.body.insertAdjacentHTML('beforeend', tmpl);
    }


    function touchStart(e){
            e.preventDefault();
        if(isIOS && scrollEl == document.body){
            touchPos.top = window.scrollY;
        }else{
            touchPos.top = document.body.scrollTop;//初始scrollTo
        }

        if(touchPos.top > 0 || isShowLoading){
            return;
        }

        touchCurrentY = NUM_POS_START_Y;
        $refreshMain.show();
        
        if(e.touches[0]){
            touchPos.x1 = e.touches[0].pageX;
            touchStartY = touchPos.y1 = e.touches[0].pageY;
        }
    }

    function touchMove(e){
        var thisTouch, distanceY;
        var now = new Date().getTime();

        if(touchPos.top > 0 || isShowLoading || !e.touches || e.touches.length !== 1){
            // Just allow one finger
            return;
        }


        thisTouch = e.touches[0];

        touchPos.x2 = thisTouch.pageX;
        touchPos.y2 = thisTouch.pageY;

        // Distance for pageY change
        distanceY = touchPos.y2 - touchPos.y1;

        if ( touchPos.y2 > touchStartY + verticalThreshold) {

            e.preventDefault();
            e.stopPropagation();

            // Some android phone
            // Throttle, aviod jitter 
            if(now - lastTime < 90) {
                return;
            }

            if(touchCurrentY < basePosY +NUM_POS_MAX_Y){
                touchCurrentY += distanceY ;
                moveCircle(touchCurrentY)
            } else {
                doRotate();
                return;
            }

        }

        // y1 is always the current pageY
        touchPos.y1 = thisTouch.pageY;
        lastTime = now;
    }

    function touchEnd(e){
        if(touchPos.top > 0 || isShowLoading){
            return false;
        }
        e.preventDefault();
        e.stopPropagation();
        
        if(touchCurrentY > basePosY + NUM_POS_MIN_Y){
            doRotate();
        } else {
            var realStartPos = basePosY + NUM_POS_START_Y;
            if(refreshType == 2) {
                $refreshMain.css('top', realStartPos + 'px');
                $refreshMain.css('opacity', 0);
                $refreshMain.css('-webkit-transform', 'scale(' + 0  + ')');
            } else {
                // Distance must greater than NUM_POS_MIN_Y
                $refreshMain.css('-webkit-transform', 'translateY(' + realStartPos + 'px)');
            }
        }
    }
    
    /**
     * moveCircle
     * touchmove change the circle style
     *
     * @param {number} y
     */

    function moveCircle(y){
        if(refreshType == 2) {
            var scaleRate = 40;
            var scalePer = y / scaleRate > 1 ? 1 : y / scaleRate < 0 ? 0 : y / scaleRate;

            // Change opacity and scale
            $refreshMain.css('opacity', scalePer);
            $refreshMain.css('-webkit-transform', 'scale(' + scalePer  + ')');
           
            $refreshMain.css('top', basePosY + NUM_POS_START_Y + y + 'px');
            // need to recover
        } else {
            $refreshMain.css('-webkit-transform', 'translateY(' + y  + 'px)');
        }
        /* $refreshMain.css('transform', 'translateY(' + y + 'px)'); */
        $arrowMain.css('-webkit-transform', 'rotate(' + -(y * 3) + 'deg)');
        /* $arrowMain.css('transform', 'rotate(' + -(y * 3) + 'deg)'); */ 


    }


    function doRotate(){
        var realTargetPos = basePosY + NUM_POS_TARGET_Y;

        isShowLoading = true;

        // Do onBegin callback
        if (typeof onBegin === 'function') {
            onBegin();
        }

        if(refreshType == 2) {
            $refreshMain.css('top', realTargetPos + 'px');
        } else {
            $refreshMain.css('-webkit-transform', 'translateY(' + realTargetPos + 'px)');
        }


        $arrowWrapper.hide();

        // Start animation
        $spinnerWrapper.show();

        // Timeout to stop animation
        stopAnimatTimeout = setTimeout(recoverRefresh, maxRotateTime);
    }

    /**
     * recover Refresh
     * Hide the circle 
     */
    function recoverRefresh(){

        // For aviod resolve
        isStoping = true;

        // Stop animation 
        $refreshMain.addClass(noShowClass);

        $spinnerWrapper.hide();

        setTimeout(function(){
            var realStartPos = basePosY + NUM_POS_START_Y;

            $refreshMain.removeClass(noShowClass);
            
            $refreshMain.hide();
            
            if(refreshType == 2) {
                $refreshMain.css('top', realStartPos + 'px');
                $refreshMain.css('opacity', 0);
                $refreshMain.css('-webkit-transform', 'scale(' + 0  + ')');
            } else {
                $refreshMain.css('-webkit-transform', 'translateY(' + realStartPos + 'px)');
            }

            $arrowWrapper.show();

            isShowLoading = false;
            isStoping = false;

            if (typeof onEnd === 'function') {
                onEnd();
            }

        }, 500); 
    }

    function bindEvents(){
        $scrollEl.on('touchstart', touchStart);
        $scrollEl.on('touchmove', touchMove);
        $scrollEl.on('touchend', touchEnd);
    }

    function unbindEvents(){
        $scrollEl.off('touchstart', touchStart);
        $scrollEl.off('touchmove', touchMove);
        $scrollEl.off('touchend', touchEnd);
    }


    window.mRefresh = mRefresh;

})(Zepto || jQuery);

