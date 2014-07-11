var util = require( 'util' );
var $ = require('jquery');
var Leap = require( 'leapjs' );
var ModalityDriverChannel = require( '../gyes/build/gyes' ).ModalityDriver;

/**
 * Module exports
 */

module.exports = AirPointerModalityDriver;


function AirPointerModalityDriver( width, height, pointerElem ){
  this.stageWidth = width || document.body.clientWidth;
  this.stageHeight = height || document.body.clientHeight;

  if ('undefined' === typeof pointerElem){
    pointerElem = document.createElement('div');
    pointerElem.style.display = 'block';
    pointerElem.style.backgroundColor = '#0E58EF';
    pointerElem.style.borderRadius = '10px';
    pointerElem.style.width = '20px';
    pointerElem.style.height = '20px';
    pointerElem.style.position = 'absolute';
    pointerElem.style.zIndex = 255;

    document.body.appendChild( pointerElem );
  }
  this.id = 'AIRGESTURE';
  this.lastState = '';
  this.pointerElem = pointerElem;
}

util.inherits( AirPointerModalityDriver, ModalityDriverChannel );


AirPointerModalityDriver.prototype.start = function( controllerOptions ){
  controllerOptions = controllerOptions || { frameEventName: 'animationFrame' };

  var pointable,
    pos,
    pageX,
    pageY,
    self,
    targetElement,
    evt;

  self = this;

  Leap.loop(controllerOptions, function( frame ){
    if (frame.valid) {

      //if (frame.pointables.length != 1) return;

      pointable = frame.pointables[ 0 ];  // first pointable

      if ( 'undefined' === typeof pointable ){
        return;
      }

      pos = self.leapToScene( frame );
      if ( pos === null ) return;

      pageX = (pos[0] - 5);
      pageY = (pos[1] - 5);

      self.updatePointer( pageX, pageY );

      // grabbing element outside the pointer, that is why +26
      targetElement = document.elementFromPoint( pageX , pageY + 26 );

      if ( targetElement ){
        self.nextEvent( [pos[0], pos[1]], pointable, targetElement );
      }
    }
  });

};

AirPointerModalityDriver.prototype.leapToScene = function(frame) {
  var tip = frame.pointables[0].stabilizedTipPosition;
  var ibox = frame.interactionBox;
  var npos = ibox.normalizePoint(tip, true);
  var w = this.stageWidth;
  var h = this.stageHeight;

  var x = w * npos[0];
  var y = h * (1 - npos[1]);

  if ((x < 0) || (x > w) || (y < 0) || (y > h)) return null;

  return [w * npos[0], h * (1 - npos[1])];
};

AirPointerModalityDriver.prototype.nextEvent = function( pos, pointable, target ){
  var evt;
  var targetElement;
  var d = {
    'dx': pos[0],
    'dy': pos[1]
  };

  if ( (pointable.touchZone == "touching") && ((!this.lastState) || (this.lastState === 'dragend')) ) {
    this.pointerElem.style.backgroundColor = '#131986';
    this.pointerElem.style.opacity = (0.375 - pointable.touchDistance * 0.5);

    evt = new CustomEvent('fingerdown', {
      'view'       : window,
      'bubbles'    : true,
      'cancelable' : true,
      'detail'     : d,
      'pageX'      : d[0],
      'pageY'      : d[1]
    });
    target.dispatchEvent( evt );
    this.lastState = 'dragstart';

  }

  if ( (pointable.touchZone == "touching") && (this.lastState === 'dragstart') ){
    evt = new CustomEvent('fingermove', {
      'view'       : window,
      'bubbles'    : true,
      'cancelable' : true,
      'detail'     : d,
      'pageX'      : d[0],
      'pageY'      : d[1]
    });
    target.dispatchEvent( evt );
    this.currentState = 'dragmoving';
  }


  if ( (this.currentState === 'dragmoving') ){
    targetElement = document.elementFromPoint( pos[0] , pos[1]-27 );
    if (targetElement.classList.contains('droppable')){
      evt = new CustomEvent('fingerenter', {
        'view'       : window,
        'bubbles'    : true,
        'cancelable' : true,
        'detail'     : d,
        'pageX'      : d[0],
        'pageY'      : d[1]
      });
      targetElement.dispatchEvent( evt );
      this.lastState = 'dragover';
      // triggering fusion event
      this.fire( 'recognized', {'gesture':'fingerover'} );
    }
  }

  if ( (this.lastState === 'dragover') && (!target.classList.contains('droppable')) ){
    evt = new CustomEvent('fingerleave', {
      'view'       : window,
      'bubbles'    : true,
      'cancelable' : true,
      'detail'     : d,
      'pageX'      : d[0],
      'pageY'      : d[1]
    });
    targetElement.dispatchEvent( evt );
    this.currentState = 'dragmoving';
    this.lastState = 'dragleave';

  }

  if ( pointable.touchZone != 'touching' ) {
    this.pointerElem.style.opacity = (0.1);

    evt = new CustomEvent('fingerup', {
      'view'       : window,
      'bubbles'    : true,
      'cancelable' : true,
      'detail'     : d,
      'pageX'      : d[0],
      'pageY'      : d[1]
    });
    target.dispatchEvent( evt );
    this.lastState = 'dragend';
    this.currentState = '';
  }
};

AirPointerModalityDriver.prototype.updatePointer = function( x, y ){
  //pageX = (pos[0] * self.stageWidth);
  //pageY = (self.stageHeight - pos[1] * self.stageHeight);
  this.pointerElem.style.left = x + 'px';
  this.pointerElem.style.top = y + 'px';
};