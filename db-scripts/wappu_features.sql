CREATE TABLE `wappu_features` (
  `project_id` bigint(11) NOT NULL,
  `session_id` varchar(15) NOT NULL,
  `user_id` varchar(32) NOT NULL DEFAULT '-1',
  `url` text NOT NULL,
  `context` text NOT NULL,
  `context_hash` varchar(32) NOT NULL,
  `interface_version` varchar(1) NOT NULL,
  `features` text NOT NULL,
  `usability_items` text NOT NULL,
  PRIMARY KEY (`project_id`,`session_id`,`interface_version`)
);
