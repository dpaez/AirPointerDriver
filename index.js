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

  if ( 'undefined' === typeof pointerElem ){
    pointerElem = document.createElement('div');
    pointerElem.style.display = 'block';
    pointerElem.style.backgroundColor = '#040000';
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
  this.setDraggables();
  this.setDroppables();
  this.getDropsPositions();
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

AirPointerModalityDriver.prototype.setDraggables = function( draggables ) {
  draggables = ( 'undefined' === typeof draggables )? '.draggable' : draggables;

  if ('string' === typeof draggables){
    draggables = document.querySelectorAll( draggables );
  }
  if ( 'object' !== typeof draggables ){
    throw new Error( 'Please specify your droppables elements.' );
  }

  this.draggables = draggables;
};

AirPointerModalityDriver.prototype.setDroppables = function( droppables ) {
  droppables = ( 'undefined' === typeof droppables )? '.droppable' : droppables;

  if ('string' === typeof droppables){
    droppables = document.querySelectorAll( droppables );
  }
  if ( 'object' !== typeof droppables ){
    throw new Error( 'Please specify your droppables elements.' );
  }

  this.droppables = droppables;
};

AirPointerModalityDriver.prototype.getDropsPositions = function(){
  var drop;
  var rect;
  for ( var i=0; i < this.droppables.length; i++ ){
    drop = this.droppables[ i ];
    rect = drop.getClientRects();
    if ( !rect ){ break; }
    drop.posData = rect[ 0 ];
  }
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

AirPointerModalityDriver.prototype.overDroppable = function( fingerPos ){
  var targPos;
  var dropItem = false;
  console.log( 'fingerPos: ', fingerPos );
  for ( var j=0; j < this.droppables.length; j++ ){
    targPos = this.droppables[ j ].posData || false;
    console.log( 'targPos: ', targPos );
    if(
      targPos                                         &&
      (fingerPos.dx > targPos.left) &&
      (fingerPos.dx < (targPos.left + targPos.width)) &&
      (fingerPos.dy > targPos.top)                    &&
      (fingerPos.dy < (targPos.top + targPos.height)) ){
      dropItem = this.droppables[ j ];
      break;
    }
  }
  return dropItem;
};

AirPointerModalityDriver.prototype.nextEvent = function( pos, pointable, target ){
  var evt;
  var targetElement;
  var d = {
    'dx': pos[0],
    'dy': pos[1],
    'src': target
  };

  if (
      (pointable.touchZone == "touching") &&
      ((!this.lastState) || (this.lastState === 'dragend')) &&
      (target.classList.contains('draggable'))
    ) {
    this.pointerElem.style.backgroundColor = '#040000';
    this.pointerElem.style.opacity = (0.375 - pointable.touchDistance * 0.2);

    evt = new CustomEvent('fingerdown', {
      'view'       : window,
      'bubbles'    : true,
      'cancelable' : true,
      'detail'     : d,
      'pageX'      : d[0],
      'pageY'      : d[1],
      'src'        : target,
      'srcElement' : target // new
    });
    target.dispatchEvent( evt );
    this.lastState = 'dragstart';
  }

  if ( (this.lastState === 'dragstart') || (this.currentState === 'dragmoving') ) {
    evt = new CustomEvent('fingermove', {
      'view'       : window,
      'bubbles'    : true,
      'cancelable' : true,
      'detail'     : d,
      'pageX'      : d[0],
      'pageY'      : d[1],
      'src'        : target,
      'srcElement' : target // new
    });
    target.dispatchEvent( evt );
    this.currentState = 'dragmoving';
  }


  if ( (this.currentState === 'dragmoving') ){
    /* old approach
    target.style.display = 'none';
    targetElement = document.elementFromPoint( pos[0] , pos[1]-27 );
    console.info('targetElement is: ', targetElement);
    */

    /* new approach */
    targetElement = this.overDroppable( d );
    console.info('targetElement is: ', targetElement);

    //if ( (targetElement) && (targetElement.classList.contains('droppable')) ){
    if ( targetElement ){
      evt = new CustomEvent('fingerenter', {
        'view'       : document,
        'bubbles'    : true,
        'cancelable' : true,
        'detail'     : d,
        'pageX'      : d[0],
        'pageY'      : d[1],
        'src'        : target,
        'srcElement' : target
        //'srcElement' : targetElement
      });
      targetElement.dispatchEvent( evt );
      this.lastState = 'dragover';
      this.lastDragOverObj = targetElement;
      // triggering fusion event
      var data = {
        gesture: 'fingerover',
        dx: d[0],
        dy: d[1]
      };
      // triggering fussion
      this.fire( 'recognized', {'gesture':'fingerover', 'elementID': targetElement.id} );
    }
    //target.style.display = '';
  }

  if ( this.lastState === 'dragover' ){
    // old approach
    //target.style.display = 'none';
    //var overTarget = document.elementFromPoint( pos[0] , pos[1]-27 );

    // new approach
    var overTarget = this.overDroppable( d );
    //if ( (overTarget) && (!overTarget.classList.contains('droppable')) ){
    if ( !overTarget ){
      evt = new CustomEvent('fingerleave', {
        'view'       : window,
        'bubbles'    : true,
        'cancelable' : true,
        'detail'     : d,
        'pageX'      : d[0],
        'pageY'      : d[1]-27,
        'src'        : target,
        'srcElement' : target
        //'srcElement' : this.lastDragOverObj
      });
      this.lastDragOverObj.dispatchEvent( evt );
      this.lastState = 'dragleave';
      this.lastDragOverObj = undefined;
    }
    //target.style.display = 'block';
  }

  if ( pointable.touchZone != 'touching' ) {
    this.pointerElem.style.opacity = (0.1);

    evt = new CustomEvent('fingerup', {
      'view'       : window,
      'bubbles'    : true,
      'cancelable' : true,
      'detail'     : d,
      'pageX'      : d[0],
      'pageY'      : d[1],
      'srcElement' : target
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