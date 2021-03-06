import {
	get,
	set,
	getOwner,
	makeArray,
	inject,
	Application
} from "ember";
import { openBrowser } from "nwjs/Shell";
import getStreamFromUrl from "utils/getStreamFromUrl";


const { service } = inject;


function resemblesURL( str)  {
	return typeof str === "string"
	    && ( str === "" || str[0] === "/" );
}


// RoutingService is not public (yet)
// Customize it in an Application.instanceInitializer
const customRoutingService = {
	settings: service(),

	/**
	 * Refresh current route if the user tries to transition to it again
	 * Override and fix _super behavior (arguments are not being shifted correctly)
	 * @param {String} routeName
	 * @param {Object[]?} models
	 * @param {Object?} queryParams
	 * @param {Boolean?} shouldReplace
	 * @return {Promise}
	 */
	transitionTo( routeName, models, queryParams, shouldReplace ) {
		if ( arguments.length === 1 && resemblesURL( routeName ) ) {
			if ( routeName === get( this, "router.url" ) ) {
				return this.refresh();
			} else {
				const router = get( this, "router" );
				return router._doURLTransition( "transitionTo", routeName );
			}
		}

		if ( arguments.length === 1 && routeName === get( this, "router.currentRouteName" ) ) {
			return this.refresh();
		}

		const router = get( this, "router" );
		const transition = router._doTransition(
			routeName,
			makeArray( models ),
			queryParams
				? queryParams.queryParams || queryParams
				: {}
		);

		if ( shouldReplace ) {
			transition.method( "replace" );
		}

		return transition;
	},

	/**
	 * Refresh current route or go back to previous route if current route is the ErrorRoute
	 */
	refresh() {
		let routeName = get( this, "router.currentRouteName" );

		if ( routeName === "error" ) {
			let errorTransition = get( this, "router.errorTransition" );
			if ( errorTransition ) {
				set( this, "router.errorTransition", null );
				return errorTransition.retry();

			} else {
				routeName = get( this, "router.lastRouteName" );
				if ( routeName ) {
					return this.transitionTo( routeName );
				}
			}

		} else {
			return getOwner( this ).lookup( `route:${routeName}` ).refresh();
		}
	},

	history( action ) {
		window.history.go( +action );
	},

	homepage( noHistoryEntry ) {
		let homepage = get( this, "settings.gui_homepage" );
		let method = noHistoryEntry
			? "replaceWith"
			: "transitionTo";
		get( this, "router" )[ method ]( homepage || "/featured" );
	},

	openBrowserOrTransitionToChannel( url ) {
		if ( !url ) { return; }

		let stream = getStreamFromUrl( url );
		if ( stream ) {
			this.transitionTo( "channel", stream );
		} else {
			openBrowser( url );
		}
	}
};


Application.instanceInitializer({
	name: "routing-service",

	initialize( application ) {
		let routingService = application.lookup( "service:-routing" );
		routingService.reopen( customRoutingService );
	}
});
