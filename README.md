wappu-service
=============

WaPPU is a tool for usability-based A/B testing that enables prediction of usability from user interactions. A WaPPU A/B test involves two interfaces that are compared based on a usability score derived from a questionnaire. Our tool can be configured to show the questionnaire on only one interface. The usability score of the second interface is then predicted based on user interactions alone.

DISCLAIMER: This is a research prototype that is working but still highly experimental. It is not (yet) intended for productive use.

## Getting Started

1. Set up a MySQL database called *wappu* and create tables using the scripts provided under [wappu-db-scripts](wappu-db-scripts).
2. Clone my [statistics-utils](https://github.com/maxspeicher/statistics-utils "statistics-utils") repository.
3. Enter your database credentials in [statistics-utils/src/main/resources/application.properties](https://github.com/maxspeicher/statistics-utils/blob/master/src/main/resources/application.properties).
4. Deploy the statistics-utils software using `mvn package tomcat:run -Dmaven.tomcat.port=8082`. It now runs under `http://localhost:8082`.
5. Clone this repository.
6. Enter your database credentials in the second credentials block in [db.js](db.js).
7. Change host and port of the statistics-utils software in [globals.js](globals.js) if different from `localhost:8082`.
8. Run wappu-service using `node app`. It now runs under `http://localhost:3000`.
9. A first demo project is automatically installed. The dummy interfaces are deployed under `http://localhost:3000/wappu_test/indexA.html` and `indexB.html`. The corresponding analysis can be found at `http://localhost:3000/wappu/analysis?projectId=0`. The demo features a very simply set-up by only considering the relative amount of clicks inside the grey box for predicting usability. It is presented in the demo video below.
10. If you deploy WaPPU with a path different from `localhost:3000` you have to change this path in [public/wappu_test/js/wappu-tracking.min.js](public/wappu_test/js/wappu-tracking.min.js) and [wappu-frontend-dependencies/js/wappu-tracking.min.js](wappu-frontend-dependencies/js/wappu-tracking.min.js).

## Set up an A/B Test

1. The frontend for creating A/B testing projects and obtaining the code snippets to be inserted into the interfaces-under-test can be found at `http://localhost:3000/wappu`.
2. Enter a name and optional password (not yet used by the service) and click "Save Project".
3. Choose "Create a custom configuration" and define for which components of your interfaces you want to track which interaction features. The components should be defined as ID selectors (e.g., `#content`) and must be contained in both interfaces! The features (e.g., *clicks*) are suggested via autocompletion as soon as you start typing.
4. Paste the generated code snippets right before the `</body>` tags of the two different versions of your interface.
5. The contents of [wappu-service/wappu-frontend-dependencies](wappu-service/wappu-frontend-dependencies) have to be available under the same path as your interfaces-under-test.
6. The real-time analysis of your A/B test can be accessed via `http://localhost:3000/wappu/analysis?projectId=[...]`. The project ID is contained in the code snippets pasted into the involved interfaces.
7. We strongly recommend watching the demo video below to get a better understanding of WaPPU's functionalities and principles.

## Limitations

If you track more than one feature for a component in a demo set-up of wappu-service, you will get highly inaccurate predictions. This is because the classifier used improves in prediction quality only with growing amounts of data. However, WaPPU has not yet been tested in a real-world scenario with massive amounts of data.

## Demo Video

[http://www.youtube.com/watch?v=vj4cNi7O4ws](http://www.youtube.com/watch?v=vj4cNi7O4ws)

## Publications

* Maximilian Speicher, Andreas Both, and Martin Gaedke (2014). "Ensuring Web Interface Quality through Usability-based Split Testing". In: *Proc. ICWE*.
* Maximilian Speicher, Andreas Both, and Martin Gaedke (2014). "WaPPU: Usability-based A/B Testing". In: *Proc. ICWE (Demos)*.

Also, a [poster](http://twentyoheight.wordpress.com/2014/07/07/how-to-infer-usability-from-user-interactions-my-poster-presented-at-icwe2014/) about WaPPU has been presented at the 2014 *International Conference on Web Engineering*.
