WaPPU: Was that Page Pleasant to Use?
=====================================

Copyright &copy; 2013&ndash;2014  Maximilian Speicher.
The *commercial* use of this software or derivatives thereof is not permitted. If you would like to use the software or derivatives for commercial purposes, please contact the copyright holder.

----------

WaPPU is a tool for usability-based A/B testing that enables the prediction of usability scores from user interactions, e.g., **webpage A has a usability of 99 while webpage B has a usability of only 42.** The default configuration is to show a minimal questionnaire before a user leaves the first webpage. The usability score of the second webpage is then predicted based on user interactions alone. This is done by usability models that are trained from users' answers to the questionnaire on webpage one.

If you make use of WaPPU, please include the following copyright statement:
*The WaPPU Service &mdash; https://github.com/maxspeicher/wappu-service/ &mdash; Copyright &copy; 2013-2014  Maximilian Speicher*

If you want to cite WaPPU, please refer to the following research paper: [Ensuring Web Interface Quality through Usability-based Split Testing](http://link.springer.com/chapter/10.1007/978-3-319-08245-5_6)

## Set up your WaPPU Server!

1. Set up a MySQL database called *wappu* and create tables using the scripts provided under [db-scripts](db-scripts).
2. Clone my [statistics-utils](https://github.com/maxspeicher/statistics-utils) repository.
3. Enter your database credentials in [statistics-utils/src/main/resources/application.properties](https://github.com/maxspeicher/statistics-utils/blob/master/src/main/resources/application.properties).
4. Deploy the statistics-utils software using `mvn package tomcat:run -Dmaven.tomcat.port=8082`. It now runs under `http://localhost:8082/statistics-utils`.
5. Clone this repository.
6. Enter your database credentials in the second credentials block in [server/db.js](server/db.js).
7. Change host and port of the statistics-utils software in [server/globals.js](server/globals.js) if different from `localhost:8082`.
8. Run wappu-service using `node app`. It now runs under `http://localhost:8081`.
9. A first demo project is automatically installed. The dummy interfaces are deployed under `http://localhost:8081/wappu-demo/indexA.html` and `indexB.html`. The corresponding analysis can be found at `http://localhost:8081/wappu?projectId=0`. The demo features a rather simple set-up by only considering the absolute amount of clicks inside the grey box for predicting usability. This is to ensure good prediction quality even with small amounts of data. The demo is also presented in the video referenced below.
10. If you deploy WaPPU with a path different from `localhost:8081` you have to change this path in [server/public/wappu-demo/js/wappu-tracking.js](server/public/wappu-demo/js/wappu-tracking.js) and [client/wappu-tracking.js](client/wappu-tracking.js).

## Set up the Client!

First, set up the two webpages you want to compare using a WaPPU-based A/B test. Then, include the JavaScripts contained in [client](client) right before `</body>` on both webpages. Finally, initialize WaPPU using the function

`WaPPU.start(options, components, pageFeatures)`:

* **options** (required) is a JSON object containing the following parameters:
  * **interfaceVersion** (required): A or B.
  * **projectId** (required): A unique ID in integer format that you do not use for any other WaPPU A/B test.
  * **userId** (optional, default `-1`): A user ID in integer format, in case you want to track users across sessions.
  * **provideQuestionnaire** (optional, default `false`): Indicates whether the webpage presents an [INUIT](https://github.com/maxspeicher/inuit-resources) questionnaire to the user. *At least one of the webpages-under-test must present the questionnaire!* More details are given below.
  * **useDefaultContext** (optional, default `true`): WaPPU is a context-aware tool, since different user contexts trigger different interaction feature values. Therefore, WaPPU provides separate usability scores and learns separate models for different contexts. The default context considers the presence of an ad blocker and the screen size, e.g., `{"adBlock":true,"screenCtx":"HD"}`. Set this option to `false` if you do not want to make use of these default context dimensions. If so, you do not need to include `advertisement.js` on the client.
  * **additionalContext** (optional, default `{}`): Add your own context dimensions in terms of a JSON object, e.g., `{"loggedIn": true, "browser": "IE9"}`.
  * **useRelativeFeatures** (optional, default `true`): For each absolute feature that is tracked (e.g., clicks on navigation bar), WaPPU calculates an additional relative feature w.r.t. the whole webpage (e.g., clicks on navigation bar divided by total clicks on page). Set this option to `false` if you need more precise predictions for small amounts of interaction data.
* **components** (required): A JSON object specifying which interaction features shall be tracked on which components of the webpage. The keys of the components object are jQuery selectors identifying the different components (e.g., `#navigation`); the values are arrays listing the features to be tracked for each component. The following features are available:
  * `arrivalTime`: amount of time between page load and first hover
  * `charsDeleted`: number of characters deleted in input fields
  * `charsTyped`: number of characters typed into input fields
  * `clicks`: number of clicks
  * `cursorMovementTime`: time the cursor spent moving over the component
  * `cursorSpeed`: cursor speed while hovering the component
  * `cursorSpeedX`: cursor speed on horizontal axis
  * `cursorSpeedY`: cursor speed on vertical axis
  * `cursorStops`: number of times the cursor stopped and remained still while hovering the component
  * `cursorTrail`: length of the cursor trail over the component
  * `cursorTrailX`: length of cursor trail on horizontal axis
  * `cursorTrailY`: length of cursor trail on vertical axis
  * `hovers`: number of hovers over component
  * `hoversPrevHoveredText`: number of hovers over previously hovered text elements within component
  * `hoverTime`: total time the cursor spent hovering the component
  * `inputFocusAmount`: number of times input fields have been focused within component
  * `maxHoverTime`: duration of longest single hovering action
  * `multiplyHoveredText`: amount of text elements within component that have been hovered more than once
  * `textSelections`: number of text selection actions within component
  * `textSelectionLength`: cumulative length of text snippets that have been selected/highlighted within component
* **pageFeatures** (optional, default `[]`): Some features can only be tracked for a webpage as a whole. If you want to track such features, include them in the pageFeatures array:
  * `cursorRangeX`: range of the cursor on the horizontal axis
  * `cursorRangeY`: range of the cursor on the vertical axis
  * `pageDwellTime`: total time spent visiting the page
  * `scrollingDirectionChanges`: number of times the scrolling direction is changed
  * `scrollingMaxY`: maximum scrolling distance from top
  * `scrollingPixelAmount`: total amount of scrolling in pixels
  * `scrollingSpeed`: self-explaining

Please be aware that *all* of the above options except **interfaceVersion** and **provideQuestionnaire** must be identical in *both* webpages-under-test!

### The `provideQuestionnaire` Option

In case you set `provideQuestionnaire` to `false`, all interaction data is automatically sent to the WaPPU server at a predefined interval. However, in at least one of the webpages-under-test, the option must be set to `true`. In this case, the automatic data transfer is disabled. Rather, it is required that the user is provided with an [INUIT](https://github.com/maxspeicher/inuit-resources) questionnaire before leaving the page. The answers to this *yes/no* questionnaire must be collected in a JSON object of the form:

```javascript
{
  informativeness: 0,
  understandability: 1,
  confusion: 0,
  distraction: 1,
  readability: 0,
  infDensity: 1,
  reachability: 0
}
```

The values of the individual items can be either `1` (positive answer) or `0` (negative answer). The object is then passed to the function `WaPPU.save(args)`, which sends it to the WaPPU server along with the collected interaction data:

* **args** is a JSON object containing the following parameters:
  * **usabilityItems** (required): The obove JSON object containing the answers to the INUIT questionnaire.
  * **callback** (optional): A function to be called after the data has been sent.

WaPPU does not provide a function for automaticlly displaying the [INUIT](https://github.com/maxspeicher/inuit-resources) questionnaire, as its layout and specific implementation highly depend on the webpages to be tested. However, for inspiration, please have a look at the sample project under [server/public/wappu-demo](server/public/wappu-demo).

### Stopping & Resuming Interaction Tracking

If you need to pause and resume WaPPU's tracking functionalities (e.g., because you are assessing asynchronous webpages), please use the functions `WaPPU.stop()` and `WaPPU.resume()`.

### Classification

WaPPU currently supports two incremental classifiers for learning its usability models: the *Naive Bayes* classifier and the *Hoeffding tree*. Which one to use can be configured in [server/globals.js](server/globals.js) (parameter `WAPPU_CLASSIFIER`, value `moa.classifiers.bayes.NaiveBayes` or `moa.classifiers.trees.HoeffdingTree`). These classification algorithms are powered by [MOA](http://moa.cms.waikato.ac.nz/).

## Get your Usability Scores! 

Once you have set up your server and WaPPU-powered A/B test, you can access the real-time analysis at `<endpoint of server>/wappu?projectId=X`, with `X` being your unique project ID. First, WaPPU shows all registered contexts along with the corresponding numbers of users<sup>1</sup>. By clicking a context, you are provided with the detailed comparison of your webpages' usability (in terms of the seven INUIT items and an overall usability score). Moreover, a traffic light automatically indicates whether the difference between your webpages is statistically significant based on a *Mann-Whitney U test.*

<sup>1</sup> These numbers are upper bounds, as it is possible that certain instances cannot be classified by WaPPU's models and the number of users is thus smaller on the actual analysis page.

## Limitations

The more features you track the more imprecise WaPPU's predictions will be at first. This is because the supported classifiers improve only with growing amounts of data. However, WaPPU has not yet been tested in a real-world scenario with massive amounts of data.

## Demo Video

[http://www.youtube.com/watch?v=vj4cNi7O4ws](http://www.youtube.com/watch?v=vj4cNi7O4ws)

## Publications

* Maximilian Speicher, Andreas Both, and Martin Gaedke (2014). "Ensuring Web Interface Quality through Usability-based Split Testing". In: *Proc. ICWE*.
* Maximilian Speicher, Andreas Both, and Martin Gaedke (2014). "WaPPU: Usability-based A/B Testing". In: *Proc. ICWE (Demos)*.

Also, a [poster](http://twentyoheight.wordpress.com/2014/07/07/how-to-infer-usability-from-user-interactions-my-poster-presented-at-icwe2014/) about WaPPU has been presented at the 2014 *International Conference on Web Engineering*.
