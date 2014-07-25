CREATE TABLE `wappu_models` (`project_id` bigint(11) NOT NULL, `context` text NOT NULL, `context_hash` varchar(32) NOT NULL, `interface_version` varchar(1) NOT NULL, `item` varchar(20) NOT NULL, `classifier` varchar(70) NOT NULL, `model` text NOT NULL, PRIMARY KEY (`project_id`,`context_hash`,`interface_version`,`item`,`classifier`), CONSTRAINT `wappu_models_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `wappu_project` (`project_id`));